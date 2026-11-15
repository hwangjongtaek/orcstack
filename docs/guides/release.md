# 릴리스

orcstack은 [SemVer](https://semver.org/lang/ko/)를 쓴다. 릴리스는 PR 하나로 준비하고, 태그는 `main`이 붙인다. 근거는 [M5-2 brief](../briefs/m5-2-first-release.md)에 있다.

## 순서

1. 바뀐 내용을 CHANGELOG의 `## [Unreleased]`에 적는다. 비어 있으면 `prepare`가 거부한다.
2. 릴리스 브랜치에서 준비한다.

   ```bash
   node tools/release.mjs prepare --version 0.2.0
   npm run check
   ```

   `prepare`가 하는 일:
   - `VERSION`과 `package.json`의 버전을 올린다.
   - Unreleased를 `## [0.2.0] - 날짜` 절로 옮기고, 그 절에 `upstream: pstack <버전> (<커밋>)` 줄을 `sync/upstream.json`의 pin에서 쓴다.
   - `dist/`를 다시 빌드한다. 하네스 매니페스트의 `version`이 바뀐다.
3. PR을 올리고, `tier0`·`tier1`이 green이면 머지한다.
4. `main`에 `VERSION` 변경이 들어오면 `.github/workflows/release.yml`이 `v0.2.0` 태그와 GitHub Release를 만든다. 본문은 CHANGELOG의 해당 절이다. 이미 있는 태그는 건드리지 않는다.

## 버전 올리는 기준 (1.0 전)

- **minor:** 하위 호환되지 않는 변경과 기능 추가. playbook·skill의 이름 변경이나 삭제, `.orcstack/config.json` 형식 변경, 새 skill이 여기 해당한다. 이름이 바뀌면 그 이름을 쓰던 프로젝트 설정이 `guard`에서 실패하므로 CHANGELOG에 적는다(ADR-0004).
- **patch:** 동작을 바꾸지 않는 수정, 문서, upstream sync.

## 사용자 쪽 갱신

설치본은 매니페스트의 `version`으로 갱신 여부를 판단한다. 하네스별 갱신 명령은 [README](../../README.md#코딩-에이전트별-세팅)에 있다.
