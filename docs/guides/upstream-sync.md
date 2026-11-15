# upstream sync 운영

orcstack의 `src/`는 upstream pstack(`cursor/plugins`의 `pstack/`)에서 파생된다. upstream 갱신은 주간 sync PR로만 들어오고, 머지는 사람이 한다. 판정 규칙은 [M1-5 brief](../briefs/m1-5-sync.md), 이 작업의 근거는 [M5-1 brief](../briefs/m5-1-weekly-sync.md)에 있다.

## 주간 job

`.github/workflows/sync.yml`이 매주 월요일 09:00(KST)에 돈다. Actions 탭에서 **sync → Run workflow**로 바로 돌릴 수도 있다.

1. upstream을 clone하고 `node tools/sync-pr.mjs`로 `sync/upstream.json`의 `ref`(`main`)까지 sync한다.
2. 아래 경우에는 아무것도 하지 않는다.
   - upstream이 pin에서 움직이지 않았다.
   - upstream은 움직였지만 orcstack이 파생하는 파일은 그대로다. 다른 플러그인이나 `exclude` 경로만 바뀐 경우다. pin도 그대로 둔다.
3. sync가 통과하면 `dist/`를 다시 빌드하고 PR을 연다. 실패하면 충돌 마커를 남긴 채 draft PR로 연다.
   - 플랜이 draft를 지원하지 않으면 제목에 "(충돌 해결 필요)"를 붙인 일반 PR로 연다.
4. 브랜치는 `sync/pstack-<upstream sha7>`이다. 같은 브랜치가 이미 있으면 push하지 않는다. 사람이 그 브랜치에서 충돌을 풀고 있을 수 있기 때문이다.

PR 본문에는 다음이 들어간다.

- 충돌, 신규 skill, 사라진 skill, 추가·갱신·삭제 파일
- `src/`에 남은 denylist 잔존
- sync job에서 돌린 `npm run check` 결과
- 열려 있는 이전 sync PR
- 사람이 할 일 체크리스트

## `ORCSTACK_SYNC_TOKEN` (필수)

`datamaker-kr` 조직은 "Allow GitHub Actions to create and approve pull requests"를 꺼 두었다. 그래서 저장소 설정에서도 이 항목이 잠겨 있고, 기본 `GITHUB_TOKEN`으로는 PR을 열 수 없다. 조직의 모든 저장소에 Actions의 PR 생성·승인 권한을 여는 대신, sync job은 `ORCSTACK_SYNC_TOKEN` secret으로 PR을 연다. 이 토큰으로 연 PR에는 `tier0`·`tier1`도 자동으로 돈다(2026-11-06 등록).

토큰은 fine-grained personal access token이다.

| 항목 | 값 |
|---|---|
| Resource owner | `datamaker-kr` |
| Repository access | Only select repositories → `hwangjongtaek/orcstack` |
| Repository permissions | Contents: Read and write, Pull requests: Read and write (Metadata: Read는 자동) |

- 등록 위치: Settings → Secrets and variables → Actions → `ORCSTACK_SYNC_TOKEN`.
- 조직이 fine-grained 토큰 승인을 요구하면, 조직 관리자가 승인할 때까지 토큰이 동작하지 않는다.
- sync PR과 커밋은 토큰 주인 이름으로 올라간다.
- **만료되면 갱신한다.** 만료된 토큰으로는 checkout 단계부터 실패한다. 새 토큰을 같은 이름으로 다시 등록하고, Actions → sync → Run workflow로 확인한다. job 로그의 `HAS_SYNC_TOKEN: true`가 secret이 잡혔다는 표시다.
- secret이 없으면 job은 기본 토큰으로 돌고 PR 생성 단계에서 실패한다. sync 브랜치는 push된 상태로 남으므로, 사람이 그 브랜치로 PR을 열면 된다.

## 충돌을 푸는 법

1. sync 브랜치를 받아 충돌 마커(`<<<<<<< orcstack` … `>>>>>>> upstream`)를 푼다.
2. upstream과 달라진 파일을 `sync/forks.json`에 이유와 함께 등록한다.
3. 같은 upstream 커밋으로 pin을 옮기고 `dist/`를 다시 빌드한다. `--resolved`는 마커가 남아 있거나 등록되지 않은 분기가 있으면 실패하고 pin을 그대로 둔다.

   ```bash
   git clone --filter=blob:none https://github.com/cursor/plugins.git ~/src/cursor-plugins
   node tools/sync.mjs --upstream ~/src/cursor-plugins --to <upstream sha> --resolved
   node tools/build.mjs
   npm run check
   ```

4. 신규 skill은 유지, fork, 제외 중 하나로 정한다. 제외는 `sync/upstream.json`의 `exclude`에 넣는다.
5. 커밋하고 push한다. `tier0`·`tier1`이 green이면 머지한다.

`sync/upstream.json`의 pin은 손으로 고치지 않는다. pin은 `tools/sync.mjs`만 옮긴다.
