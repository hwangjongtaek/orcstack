# Brief: sync 설정 초판

- SSOT: §4 F2, §6 C1·C3·C4
- 작업 항목: M1-2
- 날짜: 2026-11-06

## 무엇을, 왜

upstream 파생 규칙을 코드가 아니라 `sync/*.json` 데이터로 둔다. 규칙이 데이터여야 sync PR에서 규칙 변경이 리뷰되고, 파생이 결정적으로 유지된다(C3). 내용은 [derive 잔존](../spikes/derive-residue.md)의 규칙 초안을 옮긴다.

외부 의존성을 쓰지 않으므로(ADR-0002 D5) JSON Schema 검증기를 들이지 않고, 설정 로더가 형식과 의미를 직접 검증한다. 계획의 "각 JSON 스키마"는 이 로더의 검증 규칙으로 대신한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `sync/`에 `upstream`, `rename`, `substitutions`, `denylist`, `attribution`, `forks` 설정 6개가 있고 로더가 오류 없이 읽는다 | 커밋된 설정이 깨진 채 머지됨 | 🔒 unit: 커밋된 `sync/` 로드 테스트 |
| A2 | pin이 40자리 커밋 SHA가 아니면 실패한다 | 축약 SHA로 pin | 🔒 unit |
| A3 | 정규식이 컴파일되지 않으면 어느 규칙인지 밝히며 실패한다 | 파생 중 런타임 오류 | 🔒 unit |
| A4 | 앞선 rename 규칙에 가려 영원히 적용되지 않는 규칙이 있으면 실패한다 | 순서 실수로 규칙이 조용히 무효화 | 🔒 unit |
| A5 | fork 항목에 경로 중복, 빈 이유, SHA가 아닌 `since`가 있으면 실패한다 | 이유 없는 분기(C4 위반) | 🔒 unit |
| A6 | denylist·substitution 규칙 id가 중복되면 실패한다 | 같은 id로 다른 규칙이 섞임 | 🔒 unit |
| A7 | 출처 문맥(attribution) 패턴은 한 파일에만 있고 rename과 denylist가 같이 쓴다 | 두 곳에 따로 있어 어긋남 | 📎 설정 구조 |

## 범위 밖

- 규칙을 실제로 적용하는 derive(M1-4), sync(M1-5).
- 중립 토큰 표기 확정(M1-3). 여기서는 `{{capability}}` 형식으로 두고 ADR-0003에서 확정한다.

## 남은 위험

- 정규식이 의도대로 매치하는지는 M1-4의 c742dd6 전체 derive 테스트(잔존 수가 M0-1과 일치)에서 검증한다. 이 단계에서는 형식만 검증한다.
