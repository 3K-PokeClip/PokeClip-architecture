# ADR-020: LL-HLS/DVR 티어링 · 스트리밍 파라미터 · 도메인 토폴로지

> For future Claude: PokeClip 설계 결정. 상태=**채택**(2026-07-25, kty 확정). [ADR-004](ADR-004_DVR_VOD보관.md)가 "DVR 1h"를 정했다면 이 ADR은 **"그 1h를 어떤 파라미터로, 어떻게 티어링하고, 어느 도메인으로 서빙하나"**를 정한다. 핵심 5가지 — ① **세그먼트 4s · GOP 2s(1s에서 정정, 본문 표 참조) · part 0.5s** ② **티어 경계는 스트림당 공유**(사용자별 계산 금지) + 업로드 확인 게이팅 + 그레이스 오버랩 ③ **`media.*` 단일 CloudFront 배포 + `ingest.*` CDN 밖** — ~~경로 분기~~는 **§3-갱신에서 정규 URL+origin failover+Shield 상시로 대체(2026-07-27)** ④ 지연 목표 2~4s(0초급 불가) ⑤ 채팅은 시차 보정으로 맞춤. 수신부 확정은 [ADR-021](ADR-021_수신부네트워크_NLB.md). 일반개념 llhls-dvr-and-delivery, 실측 근거 discussion-log 2026-07-25 · mediamtx-spike-재현가이드.

- **상태**: 채택 (2026-07-25, kty 확정)
- **관련**: [ADR-002](ADR-002_OBS플러그인.md)(플러그인) · [ADR-003](ADR-003_미디어서버_Go.md)(미디어서버) · [ADR-004](ADR-004_DVR_VOD보관.md)(DVR 1h) · [ADR-005](ADR-005_저장일원화.md)(CMAF 한 벌) · [ADR-011](ADR-011_채팅하이라이트.md)(채팅) · [ADR-013](ADR-013_인프라.md)(인프라) · [ADR-015](ADR-015_CDN_CloudFront확정.md)(CDN)
- **반영 대상**: `specs/12-M1실행계획.md`(0단계 송출 규약에 keyint) · `specs/계약3-LLHLS-DVR재생규약.md`(신규) · `architecture.md`

## 컨텍스트

2026-07-25 로컬·EC2 재검증으로 **MediaMTX의 LL-HLS DVR이 config만으로 동작**함이 확인됐다(이전 "불가" 판정은 초소형 윈도우 + 내장 플레이어 catch-up 아티팩트 → mediamtx-spike-재현가이드 amended). 되감기 가능/불가가 더 이상 쟁점이 아니므로, 자체구현의 가치는 **티어드 전체-DVR·즉시 VOD·비용 최적화**로 이동했다. 이 ADR은 그 구체 파라미터·경계 규칙·도메인 토폴로지를 확정한다.

## 결정

### 1. 스트리밍 파라미터

| 항목 | 값 |
|---|---|
| 세그먼트 | **4s** |
| **GOP(키프레임 간격)** | **2s** — 30fps `-g 60` / 60fps `-g 120`, **플러그인이 강제** (2026-07-25 자료조사로 **1s → 2s 정정**, 아래 §외부 검증) |
| part | **0.5s** (세그먼트당 8파트) |
| PART-HOLD-BACK | 1.5s (= 3 × part, 스펙 하한) |
| DVR 윈도우 | **1시간 = 세그먼트 900개** |

- **왜 4s인가**: HLS 세그먼트는 **키프레임에서만 절단 가능**(각 세그먼트가 독립 재생돼야 하므로 첫 프레임=키프레임). 목표 길이 지점에 키프레임이 없으면 다음 키프레임까지 밀려 **세그먼트가 드리프트**한다. 4s는 **GOP 1s·2s 모두의 정수배**라 스트리머 설정 편차에 견고. 폴백(일반 HLS) 지연 ~12s, 1h 객체 900개.
- **5s 기각**: OBS 기본 GOP 2s와 안 맞아(5/2=2.5) **실제 6s로 드리프트** → 900개·hot 창·지연 예산이 전부 어긋남.
- **불변식: 세그먼트 길이는 GOP의 정수배여야 한다.** 그래서 **GOP를 스트리머 설정에 맡기지 않고 플러그인이 2s로 고정**한다([ADR-002](ADR-002_OBS플러그인.md) 무설정 UX가 인코더 설정을 대신 지정하므로 가능). **`specs/12-M1실행계획.md` 0단계 송출 규약에 "인코더 keyint = 2s 고정"을 명시**한다 — 누락 시 원인 찾기 어려운 드리프트 버그로 회귀.
- **왜 1s가 아니라 2s인가 (2026-07-25 정정)**: 초기 판단은 seek 정밀도를 위해 1s였으나 **품질 대가를 과소평가**했다. Apple HLS 오소링 스펙이 **키프레임 2초를 권고**(최대 간격)하고, 1s는 키프레임 수가 2배여서 **같은 비트레이트에서 화질이 떨어진다**(시청자 대역폭 + 60일 스토리지에 전부 영향). 2s는 **2·4·6s 세그먼트 모두의 약수**라 드리프트 방지 조건도 그대로 충족(4/2=2). **잃는 것은 실질적으로 없다** — DVR 되감기의 2s 스냅은 체감 무의미하고, **클립 컷은 항상 재인코딩([ADR-009](ADR-009_클립내보내기.md))이라 프레임 정확**하므로 GOP와 무관.
- **ABR(화질 선택)은 MVP 제외**: MediaMTX는 **트랜스코딩을 하지 않는다**(리패키징·서빙만). 화질 여러 개가 필요해지면 **외부 FFmpeg 트랜스코드 사이드카**(또는 인코더가 다중 화질 송출)를 붙인다 — "코덱 구현"이 아니라 FFmpeg 오케스트레이션. **도입 시 렌디션 간 키프레임 정렬이 필수**(ABR 스위칭 조건) → `-force_key_frames` 등으로 전 렌디션 동일 타임스탬프에 키프레임. MVP는 **단일 화질 패스스루**.
- **오해 정정(kty 2026-07-25)**: "되감기 버튼 5초 단위"를 위해 세그먼트를 5s로 할 이유는 **없다**. 되감기 단위는 프론트의 `currentTime -= N` 연산이라 세그먼트 길이와 무관. **seek 정밀도를 정하는 것은 GOP**(미버퍼 지점은 앞쪽 키프레임부터 재생) → GOP 1s면 ~1s 정밀.

### 2. 티어 경계 — 스트림당 공유 (사용자별 계산 금지)

- **hot(최근) = 75개 = 5분 → Media EC2 로컬 디스크 직접 서빙** / **cold = 825개 = 55분 → CloudFront·S3**. 매니페스트는 900개 전부 나열하고 **prefix만 바뀐다**(`/hot/*` ↔ `/cold/*`).
  - ⚠️ **[갱신 2026-07-27] prefix 교체 방식 폐기 → 세그먼트당 정규 URL 단일 고정.** 구멍 발견(kty 지적에서 도출): LL-HLS 델타(`EXT-X-SKIP`) 클라이언트는 옛 줄을 재수신하지 않으므로 **장기 시청자의 로컬 목차엔 hot 시절 URL이 그대로 남고**, HLS 스펙상 재생목록 갱신은 append/remove만 허용(나열된 URI 변경 금지)이라 서버가 고쳐줄 수도 없다 → 로컬 보관(8분)보다 오래 시청하면 hot URL이 404. **티어(저장 위치)는 시간에 따라 변하는데 URL은 불변 계약**이므로 티어를 URL에서 제거한다. 티어 판정은 서빙 시점(§3-갱신). hot/cold 경계는 이제 서빙 규칙이 아니라 **로컬 보관 설정값**으로 강등되고, 업로드 게이팅·그레이스 불변식은 failover의 안전망으로 유지된다.
- **경계를 사용자별로 계산하지 않는다.** 이유: 매니페스트는 **스트림당 1개 문서**지 사용자당 1개가 아니다. 사용자별 계산은 요청마다 본문이 달라져 **CDN 캐시가 파편화**되고 모든 요청이 오리진 직격 → 진짜 비용은 CPU가 아니라 **캐시 붕괴**.
- **기준은 벽시계가 아니라 세그먼트 시퀀스**(매니페스트 재생성 시 "최신 N개=hot"). 경계가 세그먼트 경계에 자동 정렬되어 같은 리프레시 창의 모든 시청자가 동일 본문 → 캐시 엔트리 1개. 시각 연산은 **UTC/epoch**(KST 등 로컬 타임존 금지 — DST·서버 로케일 사고).
- **업로드 확인 게이팅(필수)**: 경계 = `min(시계 목표, 마지막 S3 업로드 확인된 세그먼트)`. 세그먼트 인덱스에 업로드 확인 플래그를 두고 게이팅. 없으면 업로드 지연·실패 시 **매니페스트가 404를 가리킨다**.
- **그레이스 오버랩(필수)**: **로컬 보관 8분(120개) > 광고 5분(75개).** 경계가 지나간 세그먼트를 즉시 삭제하지 않는다(시청자가 옛 매니페스트를 들고 있을 수 있음).
- **두 시간 지평 분리**: 라이브 DVR 창(1h) = **매니페스트 노출 정책**(세그먼트는 살아있음) ≠ 실제 보관(60일, [ADR-004](ADR-004_DVR_VOD보관.md)) = **S3 lifecycle**.

### 3. 도메인 · CDN 토폴로지

```
media.pokeclip.com   (CloudFront 단일 배포 — ADR-015 "단일 배포·비헤이비어 분리" 정합)
├── /hot/*   → Media EC2   (매니페스트 TTL 1~2s)
└── /cold/*  → S3          (세그먼트 불변 장TTL) + Origin Shield

ingest.pokeclip.com → EIP  (SRT/UDP 8890, CDN 밖)
```

- **왜 IP가 아니라 도메인인가**: ① 앱이 HTTPS면 `http://IP:8888` 세그먼트는 **mixed content로 차단** → 도메인+ACM 인증서 필요, CloudFront가 TLS 종단 ② EIP·인스턴스 교체·failover에 견고 ③ **서명 쿠키 도메인 스코핑** — 쿠키는 도메인에 묶이므로 앱(`app.pokeclip.com`)과 미디어(`media.pokeclip.com`)가 쿠키를 공유하려면 **`Domain=.pokeclip.com`**으로 발급해야 한다. **서브도메인 구조를 이 기준으로 설계한다.**
- **단일 배포 + 경로 분기**를 택한 이유: 티어 전환이 **매니페스트의 prefix 교체만**으로 되고, 서명 쿠키 1개가 hot·cold 둘 다 커버하며, DNS/TLS 핸드셰이크가 1회.
- **`ingest.*`는 CDN 밖**: SRT=UDP라 CloudFront가 못 다룬다. 도메인으로 두면 **인스턴스 교체에도 스트리머 OBS 설정이 안 바뀐다**(2026-07-25 실습에서 EC2 재생성 시 IP가 바뀐 문제).
- **오리진 잠금(필수)**: EC2 커스텀 오리진은 S3의 OAC를 쓸 수 없다 → **SG를 CloudFront 관리 prefix list `com.amazonaws.global.cloudfront.origin-facing`으로 제한 + 커스텀 헤더 공유 시크릿을 오리진에서 검증**. 없으면 `:8888`을 직접 때려 **CDN·서명 쿠키를 우회** 가능(2026-07-25 데모에서 실제로 공개 개방했던 구멍).

### 3-갱신. [2026-07-27] 단일 정규 URL + CloudFront Origin Failover (경로 분기 대체)

§2 갱신(URI 불변 계약)에 따라 `/hot·/cold` 경로 분기를 **오리진 그룹 failover**로 대체한다:

```
media.pokeclip.com  (CloudFront 단일 배포 — ADR-015 정합 유지)
├── /live/{id}/index.m3u8 → Media EC2(매니페스트 레이어)  TTL 1~2s
└── /live/{id}/seg/*      → Origin Group:
                             primary  = EC2 (로컬에 있으면 200, 없으면 즉답 404)
                             failover = S3  (404·5xx·연결실패 시)
                             세그먼트 불변 장TTL + Origin Shield 상시(리전=서울 고정)

ingest.pokeclip.com → NLB(UDP) → 프라이빗 서브넷 EC2  [확정 — [ADR-021](ADR-021_수신부네트워크_NLB.md)]
                      (+S3 Gateway VPC Endpoint 필수 — NAT $0.045/GB 회피)
```

- **운영 규칙**: EC2는 없는 파일에 **즉답 404**(S3 프록시 시도 금지 — 지연 배수 방지) · CloudFront **Error Caching Minimum TTL(4xx) 0~1s**(기본 ~10s면 순간 404가 눌어붙음) · 축출 = **`(그레이스 경과) AND (업로드 확인)` 세그먼트별 독립**(HOL 블로킹 구조적 부재, [계약-세그먼트인덱스](../contracts/계약-세그먼트인덱스.md) 불변식 2 갱신).
- **부수 효과**: ① 같은 정규 URL로 **VOD 재사용**(종료 후 전부 S3 failover 서빙) ② **EC2 사망 시 업로드된 구간 전부 자동 S3 서빙**(잃는 건 미플러시 꼬리 = 배치 간격만큼) ③ 순단·서버 재배정 시 목차의 과거 구간 URL 수정 불요.
- **기각 대안**: EC2 302→S3(클라 홉+1, 정규 URL 아래 바이트 대신 302가 캐시돼 URL 이원화 부활 — 콜드 위치가 동적이어야 할 미래에만 재검토) · EC2가 S3 프록시(콜드 트래픽이 EC2 대역폭 점유).
- 404 왕복 비용: 동일 리전 ~5-20ms, 캐시 계층당 첫 1회만 — 되감기 시킹 맥락에서 체감 무해.
- **[갱신 2026-07-27b] Origin Shield 상시 채택(kty)** — "성장 시 옵션"을 기각하고 처음부터 켠다. 효과: 오리진 유입이 PoP 수와 무관해져 **용량 상수가 "동시 방송 수 × ~1"로 단순화**(블로킹 리로드 홀드 연결·콜드 첫 요청 모두 전역 ~1회로 수렴). 조건: **쉴드 리전 = 오리진 리전(서울) 고정**(추가 홉 수 ms). 비용: 요청당 소액(파일럿 월 ~$1-3). [ADR-021](ADR-021_수신부네트워크_NLB.md)과 같은 철학 — 소액 고정비로 걱정 한 종류 제거.

### 4. 지연 목표 — LL-HLS 2~4s, "0초급"은 채택하지 않음

지연 예산(2026-07-25 산정): 인코딩 0.1~0.5s + SRT 버퍼 0.2s~ + 서버 part 패키징 ~0.5s + **CDN 왕복 0.02~0.08s** + **플레이어 hold-back ~1.5s** + 디코드 0.1s ≈ **2~4s**. 기능명세서 "LL-HLS 2~5초"와 부합.

- **병목은 CDN이 아니라 플레이어**다(스펙이 part 3개 확보를 요구 → part × 3이 하한).
- **0초급(0.2~0.5s)은 WebRTC 영역**이며 DVR·CDN 스케일·CMAF 한 벌([ADR-005](ADR-005_저장일원화.md))과 상충 → **채택하지 않음.**

### 5. 채팅 동기화 = 시차 보정 (지연 축소가 아니라)

채팅은 WS로 거의 실시간(~0.1s), 영상은 2~4s 뒤 → 그대로 두면 **채팅이 영상보다 먼저 도착해 스포일러**가 된다. 해법은 **채팅에 타임스탬프를 박고 프론트가 `video.currentTime` 기준으로 늦게 렌더**([ADR-011](ADR-011_채팅하이라이트.md) "시차 보정"). **DVR 되감기에도 필수** — 10분 전으로 되감으면 그 시점 채팅이 다시 흘러야 하므로, 재생 위치 기준 렌더링이면 라이브·되감기가 자동으로 일치한다.

## mediamtx 설정 스냅샷 (베이스 서버, 2026-07-25 검증 구조에 4s 적용)

```yaml
hlsVariant: lowLatency
hlsSegmentDuration: 4s
hlsPartDuration: 500ms
hlsSegmentCount: 120        # 8분 = 광고 5분 + 그레이스 3분
hlsAlwaysRemux: yes
hlsDirectory: /tmp/hls_data
srt: yes
srtAddress: :8890
```

## 외부 검증 (2026-07-25 자료조사)

| 값 | 판정 | 근거 |
|---|---|---|
| 세그먼트 **4s** | ✅ 표준 | OvenMediaEngine 공식 LL-HLS 실험이 **전 구성에서 세그먼트 4s 고정** 사용(LL-HLS 사실상 표준값. Apple의 6s 권고는 일반 HLS 기준) |
| part **0.5s** | ✅ 안정 지향 정답 | Apple 권고 범위 **"0.2~0.5초"의 안정 쪽 상한**. OME 3구성 중 **"Balanced"가 정확히 0.5s** |
| PART-HOLD-BACK **1.5s** | ✅ 스펙 정확 | RFC 8216bis: *"MUST be at least twice the Part Target Duration. SHOULD be at least three times"* → 1.5s = **정확히 3배** |
| GOP 1s → **2s** | ⚠️ **정정됨** | Apple 오소링 스펙 **키프레임 2초 권고**(최대 간격). 짧은 GOP는 화질 저하. 2s는 2·4·6s 세그먼트 모두의 약수 |

**결정적 검증**: OME 실험의 **"Balanced" 구성 = 세그먼트 4s + part 0.5s + hold-back 1.5s → 실측 지연 1.934초**이며, 그들이 *"실전 배포 권장"*으로 지정한 조합. **우리 값과 완전히 동일** → 독립 검증된 안정 구성.

OME 3구성 실측: 안정(part 1.0s/hold 3.0s)=**3.734s** · **균형(0.5s/1.5s)=1.934s ← 우리** · 저지연(0.2s/0.6s)=**1.034s**. 저지연 구성은 *"불안정 네트워크·고부하에서 버퍼링 위험 증가"* → 안정 우선인 우리 목표와 불일치.

**⚠️ 실측 불일치 발견(우리 스파이크)**: `hlsPartDuration: 200ms`일 때 mediamtx가 뱉은 매니페스트는 **`PART-HOLD-BACK=0.50000` = 2.5배**. RFC의 **MUST(2배)는 충족하나 SHOULD(3배) 미달**. → part 500ms면 mediamtx가 **1.25s**를 뱉을 가능성이 크다. **구현 시 실측 확인 + 조정 가능 여부 확인 필요**([계약3-LLHLS-DVR재생규약](../contracts/계약3-LLHLS-DVR재생규약.md)의 1.5s를 실측값으로 정정할 수 있음).

**출처**: [RFC 8216bis(draft-pantos-hls)](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis) · [OME LL-HLS 실험](https://medium.com/@OvenMediaEngine/low-latency-hls-the-era-of-flexible-low-latency-streaming-ec675aa61378) · [Apple HLS 권고 업데이트](https://www.radiantmediaplayer.com/blog/an-update-to-apple-hls-best-practices-end-2024.html) · [Apple 권고 변경(Streaming Learning Center)](https://streaminglearningcenter.com/articles/apple-makes-sweeping-changes-to-hls-encoding-recommendations.html) · [WINK 2025 실험(HLS 900ms)](https://www.wink.co/documentation/Ultra-Low-Latency-HLS-Experiments-2025) · 학술: [Bentaleb et al., *Low Latency Live Streaming Implementation in DASH and HLS*, ACM MM'22](https://dl.acm.org/doi/pdf/10.1145/3503161.3548544)

## 검토한 대안

- **세그먼트 2s**: 폴백 지연 6s로 유리하나 1h 1800객체 → S3 PUT·인덱스 행 2배 → 비용. 기각(4s로 절충).
- **세그먼트 5s**: 객체 720개로 최소지만 **2s GOP와 비정수배 → 6s 드리프트**. 기각.
- **사용자별 경계 계산**: 개인화 여지는 있으나 **CDN 캐시 파편화**로 오리진 직격. 기각.
- **hot/cold 배포 2개(서브도메인 분리)**: 격리는 낫지만 쿠키·TLS·DNS가 2배, [ADR-015](ADR-015_CDN_CloudFront확정.md) 단일 배포 결정과 상충. 기각.
- **WebRTC 저지연 경로 병행**: 0.5s급 가능하나 DVR·CDN·CMAF 한 벌 포기 + MVP 범위 초과. 보류(MVP 이후 재검토).

## 후속 (TODO)

- ~~`specs/12-M1실행계획.md` 0단계 송출 규약에 **"인코더 keyint = 1s 고정"** 반영~~ — ✅ **완료(2026-07-25)**: SRT 입력 규약에 인코딩 규약(MPEG-TS·H.264·전트랙 AAC·keyint 1s + 드리프트 근거) 추가.
- ~~세그먼트 인덱스 스키마(키·시작시각·길이·**업로드 확인 플래그**)를 3번과 계약~~ — ✅ **완료(2026-07-25)**: **[계약-세그먼트인덱스](../contracts/계약-세그먼트인덱스.md)** 초안 작성(필드·상태전이·불변식 4개·소유 경계·3번 리뷰 항목). M1 0단계 B7 행에서 링크.
- **`계약3-LLHLS-DVR재생규약`을 2번에게 실제 전달**(아직 안 함) — 특히 **catch-up 끄기**(2026-07-25 실측).
- **`계약-세그먼트인덱스`를 3번에게 리뷰 요청**(아직 안 함) — §5 미확정 4건(파티셔닝·보관정책·enum·Redis 캐시).
- CloudFront: Key Group(공개키)·Origin Shield·prefix list 잠금·커스텀 헤더 시크릿 설정(1번).
- 팀 repo 반영은 kty 명령 시에만(_CLAUDE Model C).

---

> 이 문서는 팀 공유용 정본입니다. 갱신 이력·논의 맥락은 팀장(1번)이 관리합니다.
