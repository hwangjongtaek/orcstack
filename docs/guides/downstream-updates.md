# dstack으로 공유 변경 전달

orcstack을 주 개발 저장소로 유지한다. dstack은 회사 프로젝트용 독립 배포본으로 유지한다. 이 문서와 내보내기 도구, 기준 해시는 orcstack에만 둔다. dstack에 orcstack remote, 링크, 자동 수신 workflow를 추가하지 않는다.

## 변경 묶음 만들기

```sh
node tools/export-dstack.mjs --target ~/Projects/datamaker/dstack --out /private/tmp/company-update
```

대상 저장소는 읽기만 한다. 출력 디렉터리는 비어 있어야 하며 두 저장소 밖에 있어야 한다. `manifest.json`은 바뀔 파일과 대상의 현재 SHA-256, 적용할 SHA-256을 담는다. `files/`에는 dstack 이름으로 변환한 파일만 둔다. 개인 이름이나 mascot 참조가 남으면 출력 전에 실패한다.

기준은 `sync/downstream.json`에 있다. 원본 dstack 커밋과 bootstrap 직후 파일 해시를 기록한다. 기존 파일은 이 기준에서 바뀐 경우만 내보낸다. 대상에 별도 변경이 있으면 충돌로 실패한다. 대상 파일이 이미 원하는 바이트와 같으면 재검토할 수 있다.

## 공유 범위

`src/`, `harness/`, `tests/`, `tools/`의 공유 코드가 대상이다. 다음 항목은 독립 배포본의 소유로 남긴다.

- 회사 README, Planning SSOT, ADR, brief, 자산, 라이선스, marketplace, 버전, 저장소 설정.
- 세션 훅과 `orc-mode/SKILL.md`의 브랜드별 진입 규칙.
- 플러그인 설치 CLI, 선택 실행기, 내보내기 도구와 해당 도구 전용 테스트.
- 기존 e2e와 fixture. 회사 배포본에서 별도 검증한다.

배포본 `dist/`는 전달하지 않는다. 대상에서 다시 빌드한다. 공유 파일 삭제는 자동 처리하지 않으며 수동 검토가 필요하다. 새 공유 파일은 허용된 디렉터리에 추가하면 후보가 된다. 바이너리 자산은 공유 코드 디렉터리에 추가하지 않는다.

## 검토하고 적용

1. `manifest.json`의 파일 목록과 SHA-256을 확인한다. 적용 직전 대상 해시가 달라졌으면 다시 내보낸다.
2. `files/`의 변경을 회사 저장소에 적용하고 diff를 검토한다. 묶음 디렉터리 자체나 이 가이드를 회사 저장소에 복사하지 않는다.
3. 회사 저장소에서 `node tools/build.mjs`와 `npm run check`를 실행한다.
4. 회사 저장소의 변경을 검토하고 커밋한다. 제목과 설명은 실제 기능 변경을 설명한다.
5. 적용한 바이트를 확인한 뒤 orcstack에서 기준을 갱신한다.

```sh
node tools/export-dstack.mjs --target ~/Projects/datamaker/dstack --acknowledge
```

`--acknowledge`는 회사 파일이 내보낼 내용과 정확히 같을 때만 orcstack의 기준 파일을 갱신한다. 회사 저장소에는 쓰지 않는다. 갱신한 기준 파일도 orcstack 변경으로 검토하고 커밋한다. 회사 쪽에서 별도 조정한 파일은 자동 승인하지 않으며 양쪽 구현을 비교해 새 기준을 수동 검토해야 한다.
