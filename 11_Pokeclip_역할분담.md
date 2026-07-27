# Pokeclip 역할 분담 (3인 · 2026-07 확정)

**이 문서의 목적**: 기능명세서(9번)의 A~I 전 항목에 오너를 지정한다. 배정 원칙은 하나 — **기능이 아니라 서비스(코드베이스)에 배정하고, 코드베이스의 소유자를 따라간다.** 경계에 걸친 것은 사람이 아니라 인터페이스 계약(문서)에서 만난다.

**같이 볼 문서**: [9_기능명세서](9_Pokeclip_기능명세서.md) · [10_데이터플로우](10_Pokeclip_데이터플로우.md) · [4_SysA](4_Pokeclip_SysA.html)

---

## 분담표

### 1번 · 팀장 — 인프라 + 미디어·잡 파이프라인

| 담당 | 기능 ID |
|---|---|
| OBS 플러그인 (C++ · libobs) — Windows 빌드·릴리스 포함 | A1~A7 |
| Media Origin — **MediaMTX(수신·LL-HLS 먹싱·DVR) + 자체 레이어(Go)**: 매니페스트 합성·티어드 서빙·즉시 VOD·업로더/janitor. 세그먼트 계약(B7) 오너 | B1~B7 |
| 렌더·업로드 워커 (Spring+FFmpeg) + SNS/SQS·Job DLQ Reconciler 운영 설계 | F1~F5 |
| 인프라 전체 — 로컬 compose·CI/CD·모니터링·CDN·HA·prod | I1~I3 · I5~I7 |
| 온보딩 연결 테스트(송출 체크리스트) 판정 로직 | — |
| 7번 사업 기획서 주도 (전원 리뷰) | — |

**근거**: 송신(플러그인)과 수신(Media Origin)은 같은 프로토콜의 양끝이라 한 사람이 쥐어야 디버깅이 안에서 끝난다. SQS 워커는 큐 길이 기반 오토스케일이 핵심이라 인프라 소유자가 잡아야 설계가 일관된다.

### 2번 — 프론트 전체 + 실시간·AI 백엔드

| 담당 | 기능 ID |
|---|---|
| 웹 대시보드 (React·TS) — 라이브 뷰·에디터 UI·보관함·VOD·온보딩/설정 화면 | D1~D4 · E1·E2(화면)·E5·E6 · G·H 화면 |
| Chat Collector (Node·TS) — 수집·시차 보정·하이라이트 탐지·아카이브 | C1~C6 (C4·C5는 M2 착수) |
| AI Worker (Python·faster-whisper) — 자막·추천 제목 | E4 · E7 |

**근거**: Chat Collector는 프론트와 같은 TS이고 산출물(차트·점프카드)이 본인 화면에 꽂힌다(원본 SysA의 "FE 겸장" 구도). AI 자막의 최종 소비처가 본인이 만드는 에디터 자막 UI라, 워커까지 쥐면 품질 튜닝 루프가 한 사람 안에서 돈다.

### 3번 — 데이터 계층 오너 + 코어 API

| 담당 | 기능 ID |
|---|---|
| PostgreSQL 스키마·마이그레이션 (10번 문서 기반) + Redis 설계(키·TTL·pub/sub) | — |
| Auth·Account Service (Spring) — OAuth·권한·채널·스트림 키·승인 | H1~H5 (백엔드) |
| Clip Service (Spring) — 점프카드(만료 포함)·레시피·템플릿·승인 플로우·잡 상태 API·Job DLQ Reconciler | D2·E8·F4의 서비스 측 |
| 에디터 서버 파트 — 구간 디코드·RMS 무음 필터·웨이브폼 (FFmpeg 커맨드 스펙은 1번 제공) | E2·E3 (서버) |

**근거**: Auth·Clip은 6개 서비스 중 DB 결합도가 가장 높은 둘 — 스키마 설계자가 그 스키마를 쓰는 서비스를 직접 짜야 탁상설계가 안 된다. Redis 활용처(세션=Auth, SSE 팬아웃=Clip)도 전부 이 안에 있다.

---

## 인터페이스 계약 9종 (경계는 문서에서 만난다)

| # | 계약 | 당사자 |
|---|---|---|
| 1 | 렌더·AI·업로드 잡 수명주기 — SQS command 공통 envelope + `POST /internal/jobs/{jobId}/events` 상태 콜백. command는 `schemaVersion`, `jobId`, `jobType`, `clipId`, `correlationId`, `idempotencyKey`, `requestedAt`, `sourceKeys`, `recipeVersion`; callback은 `Idempotency-Key`와 `STARTED|PROGRESS|RETRY_SCHEDULED|SUCCEEDED|TERMINAL_FAILED`를 사용 | 설계·승인=1, 생산·상태 소유=3, 소비=1·2 |
| 2 | **2A** Chat→Clip `POST /internal/broadcasts/{streamId}/highlights`(`streamTimestampMs`, `window.startMs/endMs`) · **2B** Web→Clip 요청 / Clip→Web SSE `GET /api/broadcasts/{streamId}/events` · **2C** Web→Chat 요청 / Chat→Web 응답 `GET /api/broadcasts/{streamId}/chat-chart?from&to&bucket` | 2A=2→3, 2B=3↔2, 2C=2 내부 경계 |
| 3 | LL-HLS/DVR 재생 URL·매니페스트 규약 | 1 → 2 |
| 4 | OBS Control API — 방송별 `streamId` 공통 사용, Bearer stream key 인증. **4A** Plugin→Media `PUT /api/streams/{streamId}/track-manifest`(manifestVersion 멱등·단조 증가) · **4B** Plugin→Clip `POST /api/streams/{streamId}/marks`(`Idempotency-Key=eventId`, 2A와 동일한 `broadcast.started`=0 방송 좌표) · **4C** Media/Clip→Auth `POST /internal/stream-keys/verify` | Plugin·Media·계약 승인=1, Clip·Auth=3 |
| 5 | 유튜브 토큰 — Auth가 Secrets Manager에 저장·회전, 잡에는 `tokenSecretRef`만 포함, Render·Upload Worker가 제한 IAM으로 직접 read | 보관=3, 사용=1 |
| 6 | 레시피 JSON 스키마 (crop·트랙·자막) — **최우선 확정** | 2 ↔ 3 ↔ 1 |
| 7 | FFmpeg 구간 디코드 커맨드 스펙 (E2·E3용) | 1 → 3 |
| 8 | AI 결과 반영 API (워커→Clip Service, DB 직접 쓰기 금지) | 2 → 3 |
| 9 | Broadcast Lifecycle Event — Media→SNS FIFO `broadcast-lifecycle.fifo`→Chat/Clip 전용 SQS FIFO·DLQ. `MessageGroupId=streamId`, `MessageDeduplicationId=eventId`, envelope·멱등·역순 방어는 ADR-016/10번 정본 | 설계·승인·생산=1, Chat 소비=2, Clip 소비=3 |

계약 1의 DLQ terminal 처리는 별도 서비스가 아니라 Clip Service 내부 **Job DLQ Reconciler**가 담당한다. Worker는 S3만 직접 읽고 쓰며 PostgreSQL 상태·결과는 계약 1·8을 통해 Clip Service가 영속화한다.

## 유보·조정 사항

- **운영 콘솔(I4)은 MVP 제외** — MVP 기간엔 CloudWatch 대시보드+DB 쿼리로 대체. 추후 착수 시: UI=2번, 모니터링·잡 재시도 API=1번, 계정 통계 API=3번.
- **조정 카드**: M1 체크포인트에서 2번의 프론트 P0가 밀리면 AI Worker(E4·E7)를 3번으로 이동한다.
- **폴백 기준(2026-07-27 갱신)**: 미디어 서버는 **MediaMTX 채택으로 수신·먹싱·DVR 리스크가 해소**됐고(ADR-003 갱신), 남은 리스크는 자체 합성 레이어(매니페스트·티어링)뿐 — B7 세그먼트 계약 기반 FFmpeg 오케스트레이션 폴백은 그대로 유지. **플러그인은 `sorayuki/obs-multi-rtmp` 포크로 착수 확정**(6트랙 네이티브 전제, 별도 private repo `pokeclip-obs-plugin`, GPL-2.0) — "포크 전환"은 폴백이 아니라 기본 경로가 됐다.

## 공통 규칙

- main 직접 push 금지 — PR + 1인 리뷰
- 최종 승인권: 스키마 변경=3번 · 인프라/큐 변경=1번 · UI/UX=2번
- M1 수직 슬라이스 기간엔 매일 짧은 싱크
