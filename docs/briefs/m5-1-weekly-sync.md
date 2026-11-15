# Brief: 주간 upstream sync Action

- SSOT: §4 F2, §6 C3 C4
- 작업 항목: M5-1
- 날짜: 2026-11-06

## 무엇을, 왜

upstream pstack 갱신을 사람이 기억해서 가져오면 늦어지고, 늦을수록 충돌이 쌓인다(F2). 매주 한 번 Action이 upstream `main` 최신 커밋으로 `tools/sync.mjs`를 돌리고, 바뀐 것이 있으면 PR을 연다. PR 본문에는 충돌, 신규 skill, 사라진 skill, 삭제 목록과 사람이 할 일이 들어간다. 머지는 사람이 한다.

- **판단 로직은 `tools/sync-pr.mjs`에 둔다.** upstream이 그대로이거나, 움직였어도 orcstack이 파생하는 파일이 그대로면(다른 플러그인이나 `exclude` 경로만 바뀜) 아무것도 하지 않는다. `cursor/plugins`의 `main`은 다른 플러그인 때문에 자주 움직이므로, 이걸 거르지 않으면 매주 pin만 옮기는 PR이 생긴다. sync가 통과하면 `dist/`를 다시 빌드한다. 실패하면 충돌 마커를 남긴 채 draft PR로 연다. YAML에는 git·gh 단계만 남긴다.
- **브랜치는 upstream 커밋마다 하나다(`sync/pstack-<sha7>`).** 같은 브랜치가 이미 있으면 다시 만들지 않는다. 사람이 충돌을 풀던 작업을 덮지 않기 위해서다.
- **충돌 해결 경로:** 충돌을 고치고 분기를 `sync/forks.json`에 등록한 뒤 `sync.mjs --to <같은 커밋> --resolved`를 돌린다. 옛 pin 기준으로 다시 3-way 병합하면 같은 줄이 또 충돌하므로, `--resolved`는 새 커밋만 기준(base = theirs)으로 `src/`를 판정하고 마커가 남아 있으면 실패한다. 수동 pin 편집을 막는 M1-5 규칙을 지키기 위한 경로다.
- **요약의 denylist 잔존은 `src/` 기준으로 바꾼다.** 기존 요약은 fork 적용 전 파생 결과의 잔존(실측 105건)을 세서, 이미 fork로 고친 줄까지 할 일처럼 보였다. tier0 validate가 보는 것과 같은 `src/` 잔존을 위치와 함께 적는다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | upstream이 pin과 같거나, 파생 결과가 그대로면 `action: none`이고 pin과 파일을 바꾸지 않는다 | 매주 빈 PR, pin만 옮기는 PR | 🔒 e2e `tests/sync-pr.test.mjs` |
| A2 | sync가 통과하면 pin이 옮겨지고 `dist/`가 새 `src/`로 다시 빌드된다. PR은 draft가 아니다 | `dist/` 낡은 PR이 tier0에서 실패 | 🔒 e2e |
| A3 | 충돌이면 pin은 그대로이고 draft PR 본문에 충돌 목록과 해결 절차가 있다 | 충돌을 숨긴 채 열린 PR | 🔒 e2e |
| A4 | 충돌을 풀고 fork를 등록한 뒤 `--resolved`로 다시 sync하면 통과하고 pin이 옮겨진다. 마커가 남아 있으면 실패하고 pin은 그대로다 | 해결 뒤에도 pin을 손으로 고쳐야 함 | 🔒 e2e `tests/sync-cli.test.mjs` |
| A5 | sync 요약에 신규 skill과 사라진 skill이 디렉터리 단위로 나오고, denylist 잔존은 `src/` 기준으로 위치와 함께 나온다 | 신규 skill이 파일 목록에 묻힘, fork로 고친 줄이 잔존으로 보임 | 🔒 e2e `tests/sync-cli.test.mjs` |
| A6 | 워크플로는 주 1회 schedule과 수동 실행으로 돌고, `sync/` 브랜치에만 push하며, `main`에 직접 쓰지 않는다 | 사람 리뷰 없는 upstream 반영 | 🔒 contract `tests/sync-workflow.test.mjs` |
| A7 | 실제 upstream(`cursor/plugins` main)으로 `sync-pr.mjs`가 동작한다 | 가짜 fixture에서만 동작 | 📎 scratch 복사본: `main` `2776ddd`는 `none`(pstack 트리 불변). pin을 한 커밋 전(`ab1f702`)으로 돌리면 충돌 1건, 잔존 2건, 해결 절차가 담긴 draft 본문 |

## 범위 밖

- 첫 실제 upstream 갱신 PR의 처리(M5-4). 이 작업은 PR을 만드는 데까지다.
- 토큰 발급. 기본 `GITHUB_TOKEN`으로 만든 PR에는 `pull_request` 워크플로가 돌지 않는다. `ORCSTACK_SYNC_TOKEN` secret이 있으면 그것을 쓰고, 없으면 본문에 tier0·tier1을 다시 돌리는 방법을 적는다. secret 등록과 "Actions가 PR을 만들 수 있음" 저장소 설정은 사람이 한다.

## 남은 위험

- 워크플로 YAML 자체는 GitHub에서만 실행된다. 로직은 `sync-pr.mjs` e2e로, YAML은 계약 테스트로 고정하고, 실제 실행은 머지 뒤 수동 실행(workflow_dispatch) 한 번으로 확인한다.
