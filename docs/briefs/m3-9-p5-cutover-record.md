# Brief: 컷오버가 자기 기록을 남긴다

- SSOT: §4 F4, §6 C5
- 작업 항목: M3-9 P5, P4, P9
- 날짜: 2026-11-06

## 무엇을, 왜

파일럿의 cold-start 검토에서 1번(왜 지금 전환하는가)과 5번(어디까지 되돌리나)에 답이 없었다. 컷오버 자체의 brief와 rollback 기록이 없었기 때문이다(P5). 함께 고친 것:

- **P4:** 동결로 끊긴 참조를 아무도 보고하지 않았다.
- **P9:** 동결 헤더("since <milestone>")와 guard 시작 시점이 어긋났다.

변경:

- `scaffold`가 컷오버 brief(`<briefs>/adopt-orcstack.md`)를 만든다. 컷오버 ADR 링크, 동결 목록, acceptance(🔒 guard와 📎 확인), 되돌리기(범위·먼저 확인할 것·절차)를 담는다. SSOT 줄은 에이전트가 채우게 비워 두어, 채우기 전에는 `work-brief check`가 실패한다.
- 컷오버 ADR 템플릿에 되돌리기 절과 재검토 임계값 칸을 더했다.
- `freeze`가 옮긴 파일이나 그 디렉터리를 아직 가리키는 줄을 `references`로 보고한다.
- 동결 헤더를 "FROZEN (read-only) on <date> at the orcstack cutover (milestone <m>)"로 바꿨다. 본문에 guard는 설치 순간부터 막는다고 적었다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `scaffold`가 컷오버 ADR을 가리키고 되돌리기 절을 가진 컷오버 brief를 만들고, ADR에도 되돌리기 절이 있다 | cold-start 1·5번 답 없음 | 🔒 unit(`tests/adopt.test.mjs`, red 먼저) |
| A2 | `freeze`가 옮긴 경로를 가리키는 줄을 파일·줄·대상과 함께 보고한다 | 끊긴 참조가 조용히 남음 | 🔒 unit |
| A3 | 동결 헤더가 날짜와 컷오버 마일스톤을 함께 적는다 | "since 2026-12"처럼 미래 시점으로 읽힘 | 🔒 unit(기존 freeze 테스트 3개의 기대를 바꿔 red 먼저) |
| A4 | 다시 컷오버했을 때 cold-start 1·5번이 답해진다 | 기록이 있어도 답 없음 | 📎 synapse-backend 복사본 재컷오버(다음 작업) |

## 범위 밖

- P6(`AGENTS.md` 상충 지시 정리): M4-5 모범 AGENTS.md와 함께 한다.

## 남은 위험

- 컷오버 brief의 why와 SSOT 줄은 에이전트와 소유자가 채워야 한다. 템플릿은 빈칸을 드러낼 뿐이다.
