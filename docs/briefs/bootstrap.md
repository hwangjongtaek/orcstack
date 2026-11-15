# Brief: orcstack bootstrap

- SSOT: §8
- 날짜: 2026-11-15

## 무엇을, 왜

개인 프로젝트의 주 개발 플러그인으로 orcstack을 만든다. Datamaker 프로젝트는 dstack을 유지하며 공유 개선만 별도 검토해 전달한다. 이 변경의 의도는 저장소 소유자의 bootstrap 요청에서 왔다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 네 하네스 배포본이 소스에서 재현된다 | 오래된 배포본 또는 잘못된 manifest | 🔒 `npm run check` |
| A2 | 두 설치가 감지되고 선택이 없으면 훅이 선택 요청과 라우팅 대기 지침을 출력한다. 실행기는 선택 없이는 시작하지 않고 선택 후 미선택 훅을 끈다 | 훅의 임의 선택 또는 실행기의 두 훅 동시 활성화 | 🔒 `tests/selection.test.mjs` |
| A3 | 제공 PNG 원본을 사용한다 | Datamaker 마스코트 포함 | 📎 원본과 SHA-256 비교 |
| A4 | 공유 변경만 dstack 명칭으로 내보낸다 | 대상 수정, 회사 문서 교체, orcstack 참조 유출 | 🔒 `tests/export-downstream.test.mjs` |

## 범위 밖

전역 플러그인 설치, 원격 게시, dstack 저장소 직접 변경은 포함하지 않는다. dstack의 기존 훅은 선택 환경 변수를 모르므로 orcstack 세션 실행기가 `DAMA_AUTO_ACTIVATE=0`을 전달한다. 직접 시작한 세션에서 이미 주입된 다른 플러그인 지침을 orcstack이 제거할 수는 없다.

## 검증 범위

로컬 빌드, 구조 검사, 테스트, 실제 shell hook 출력, 내보낸 파일을 검증한다. 네 하네스에 실제 설치하고 모델을 실행하는 e2e는 이번 변경에서 수행하지 않는다. 기존 dstack의 설치 실측 기록은 orcstack의 실측 증거가 아니다.

## Guard 분류

기존 검증 198개는 bootstrap 직후 통과했다. 새 selection과 downstream 테스트는 사용자에게 보이는 동작을 지키는 영구 guard다. 패키지 선택 테스트는 기존 훅에서 실패한 뒤 새 훅으로 통과했다. downstream 테스트는 시스템 경로 별칭을 symlink로 오인하는 실패를 드러냈고 macOS의 `/var`, `/tmp` 경로 처리를 고친 뒤 통과했다. 일회성 점검은 PNG 동일성, 실제 참조 저장소의 무변경, 최종 내보내기 파일 검사다.

## 최종 결과

- `npm run check`에서 구조 검사, brief 35개, ADR 8개, 테스트 212개가 통과했다. `node tools/build.mjs --check`가 배포본 일치를 확인했다.
- 실제 dstack은 변경하지 않았다. 별도 복사본에 내보낸 도입 템플릿을 적용한 뒤 빌드와 기존 테스트 198개가 통과했다. 전달 묶음의 파일명과 내용에 orcstack 참조가 없음을 확인했다.
- PNG 원본과 복사본의 SHA-256은 `40075f5dd2828a5345b11b436e569c7b7f1f859785732deb387a267f24a3478e`로 같다.
- 독립 검토에서 찾은 출력 경로 충돌을 수정했다. 해당 보호를 제거하면 회귀 테스트가 실패하고, 최종 구현에서는 통과했다. gpt-6.1-terra의 재검토에서 추가 차단 사항이 없었다.
- 변경 이력은 `docs/bootstrap-decisions.tsv`에 있다. 원격 릴리스, 실제 하네스 설치, 모델 e2e는 수행하지 않았다. 빈 원격 저장소를 바탕으로 한 최초 bootstrap이라 이번 실행에서는 PR을 열지 않았다.
