# Brief: README 개편: 코딩 에이전트별 세팅

- SSOT: §2, §3, §4 F1 F4 F5
- 작업 항목: M4-4
- 날짜: 2026-11-06

## 무엇을, 왜

README는 "계획 및 실험 단계, 설치 명령 없음"이라고 적혀 있었다. 이제 네 하네스에서 설치와 라우팅을 확인했으므로, 사용자 기준으로 다시 쓴다.

- **첫 화면:** orcstack이 무엇이고 누가 왜 쓰는지.
- **하네스별 세팅:** Claude Code, Codex, oh-my-pi, opencode마다 설치, 호출, 라우팅, 갱신, 제거. Codex 훅 신뢰 절차와 "신뢰 전에는 조용히 꺼져 있다"는 점. opencode 강한 모델 권장.
- **공통 준비:** 비공개 저장소라 읽기 권한과 Git 로그인이 필요하다.
- **프로젝트 도입:** `adopt-orcstack` 또는 `ADOPTING.md` → `.orcstack/config.json` → `ci-tiers`, 그리고 첫 작업 예시.
- **알려진 격차와 출처.**

에이전트용 순서는 `ADOPTING.md`, `AGENTS.md` 작성법은 가이드로 나눴다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | README의 설치 명령이 GitHub 원본에서 그대로 동작한다 | 틀린 명령, 로컬 경로에서만 되는 명령 | 📎 아래 기록 |
| A2 | README의 하네스 CLI 하위 명령(갱신·제거)이 실제 CLI에 있다 | 없는 명령 안내 | 📎 각 CLI `--help` 대조 |
| A3 | 링크가 깨지지 않고, 출처 고지가 남는다 | 끊긴 링크, MIT 고지 누락(C2) | 🔒 Tier 0 출처 검사, 📎 리뷰 |

## 설치 기록 (2026-11-06)

| 하네스 | README 명령 | 결과 |
|---|---|---|
| Claude Code | `claude plugin marketplace add hwangjongtaek/orcstack` → `install orcstack@orcstack` | M2에서 GitHub 마켓플레이스 설치를 확인했다([m2-4-5](m2-4-5-claude-code.md)). 이번에는 사용자 설정을 건드리지 않으려고 다시 하지 않았다 |
| Codex 0.163.0 | `codex plugin marketplace add hwangjongtaek/orcstack` → `codex plugin add orcstack@orcstack` | scratch `CODEX_HOME`에서 HTTPS Git으로 받아 설치했다. skill 60개 |
| oh-my-pi 18.15.0 | `omp plugin marketplace add hwangjongtaek/orcstack` → `install orcstack-omp@orcstack --scope=project` | 설치했다. skill 60개. 사용자 설정은 백업과 diff로 원래대로 돌렸다 |
| opencode 1.18.25 | `node tools/orcstack.mjs install --harness opencode --apply` | M4-3에서 확인했다(scratch `XDG_CONFIG_HOME`) |

갱신·제거 하위 명령은 `claude plugin`·`codex plugin`·`omp plugin`의 `--help`와 대조했다.

## 범위 밖

- 릴리스 버전과 태그: M5-2.

## 남은 위험

- 하네스 CLI는 자주 바뀐다(Codex는 측정 시점에 0.167.0이 나와 있었다). 설치 명령의 드리프트는 Tier 2 설치 스모크(M5-3)가 잡는다.
