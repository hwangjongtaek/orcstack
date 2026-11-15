# Brief: 저장소 기본과 dogfood 운영 문서

- SSOT: §6 C2, §7
- 작업 항목: M1-1
- 날짜: 2026-11-06

## 무엇을, 왜

이 저장소를 orcstack-governed로 운영하기 위한 기본 파일과 운영 문서를 만든다. 출처 고지(C2)를 처음부터 갖추고, 이후 모든 변경이 SSOT 절을 참조하는 brief에서 시작하게 한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `LICENSE`에 orcstack 고지와 Lauren Tan MIT 고지 전문이 모두 있다 | upstream 고지 누락 | 📎 파일 확인. 🔒 M1-7 validate가 고지 문자열을 검사한다 |
| A2 | `NOTICE.md`에 upstream URL과 기준 커밋 `c742dd6`이 있다 | 기준 커밋 없는 출처 표기 | 📎 파일 확인 |
| A3 | 이 저장소의 새 세션에서 `sdd-helper`·`tmux-orchestrator` skill이 보이지 않는다 | 유저 전역 설정 변경 | 📎 `claude -p` 세션의 skill 목록 |
| A4 | `npm run check`가 로컬에서 exit 0으로 끝난다 | 테스트가 없다는 이유로 실패 | 📎 실행 로그. M1-2부터 실제 테스트가 붙는다 |
| A5 | SSOT, ADR-0001, ADR-0002, brief·ADR 템플릿이 있다 | 결정이 작업 계획에만 남음 | 📎 파일 확인 |

## 범위 밖

- CI 워크플로(M1-8), 검사 도구(M1-7).

## 남은 위험

- A1의 영구 guard는 M1-7 전까지 없다. 그 사이 LICENSE가 바뀌면 리뷰로만 막는다.
