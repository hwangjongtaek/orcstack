# ADR-0004: 프로젝트 확장은 `.orcstack/config.json` 하나로 선언하고, `orc-mode`가 게이트 다음에 적용한다

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M3
- SSOT: §4 F6, §6 C7

## 맥락

orcstack을 개별 프로젝트에 적용하면 모든 skill·playbook이 그 프로젝트에 맞지는 않는다. 대부분은 골라 쓰면 되지만, 특정 항목은 프로젝트가 자기 규칙으로 바꾸고 싶어 한다. 예를 들면 "이 저장소의 bug-fix는 재현을 E2E로 한다" 같은 규칙이다.

제약은 다음과 같다.

- 플러그인 파일은 하네스의 플러그인 캐시에 있다. orcstack을 갱신하면 통째로 바뀌므로, 프로젝트가 그 파일을 고치면 맞춤이 사라진다(C7).
- 하네스 네 개가 공통으로 가진 경로는 저장소 안의 파일과 `orc-mode` 라우팅뿐이다. oh-my-pi와 opencode에는 세션 훅이 없다.
- `orc-mode`를 뺀 skill은 `disable-model-invocation`이라 `orc-mode`가 라우팅할 때나 사용자가 슬래시로 직접 부를 때만 실행된다.
- 혼용 금지(C5)와 출처 고지(C2)는 프로젝트 설정으로 끌 수 없어야 한다.

## 결정

1. **선언은 `.orcstack/config.json` 한 파일에 모은다.** 확장 내용 파일은 `.orcstack/` 아래에 둔다. 플러그인 파일은 고치지 않는다.

   ```json
   {
     "version": 1,
     "playbooks": {
       "visual-parity": "off",
       "bug-fix": { "extend": "playbooks/bug-fix.md" },
       "feature": { "replace": "playbooks/feature.md" },
       "data-migration": { "add": "playbooks/data-migration.md", "when": "A schema or data migration across environments." }
     },
     "skills": {
       "statechart": "off",
       "tdd": { "extend": "skills/tdd.md" }
     }
   }
   ```

2. **네 가지 동작이 있다.** 경로는 `.orcstack/` 기준 상대 경로다.

   | 동작 | playbook | skill | 의미 |
   |---|---|---|---|
   | `"off"` (선별) | 가능 | 가능 | `orc-mode`가 그 항목으로 라우팅하지 않는다 |
   | `extend` (확장) | 가능 | 가능 | 기본 파일을 연 뒤 프로젝트 파일도 읽는다. 단계는 기본 단계 뒤에 붙이고, 충돌하면 프로젝트 파일을 따른다 |
   | `replace` (대체) | 가능 | 불가 | 기본 파일 대신 프로젝트 파일을 연다 |
   | `add` (추가) | 가능 | 불가 | 기본 목록에 없는 이름의 playbook을 더한다. `when`이 라우팅 기준이다 |

   skill의 대체·추가는 하네스가 이미 제공하는 프로젝트 skill 디렉터리로 한다. orcstack skill을 `"off"`로 끄고, 프로젝트 skill을 하네스 방식으로 둔다.

3. **우선순위는 프로젝트 > orcstack 기본이다.** 단, 다음은 끄거나 바꿀 수 없다.
   - skill `orc-mode`, `adopt-orcstack`: 게이트와 컷오버를 담는다(C5).
   - playbook `opening-a-pr`의 `"off"`: 다른 모든 playbook이 마지막에 부른다. 확장과 대체는 허용한다.
   - 게이트는 확장을 읽기 전에 실행된다. 확장 파일이 다른 프레임워크를 따르라고 하면 게이트의 경우로 보고 멈춘다.
   - 출처 고지(C2)는 플러그인의 LICENSE·NOTICE·매니페스트에 있어 프로젝트 설정이 닿지 않는다.

4. **해석은 결정적 스크립트가 한다.** `adopt-orcstack/scripts/extensions.mjs`의 `resolve`가 설정을 검사하고 적용할 표를 JSON으로 낸다. `orc-mode`는 게이트 바로 다음에 이 스크립트를 실행한다. 오류가 있으면 playbook을 시작하지 않고 오류를 보인다.

5. **CI guard가 같은 검사를 한다.** `adopt-orcstack guard`가 `extensions.mjs`와 설치된 orcstack의 playbook·skill 이름 목록(`.orcstack/catalog.json`)을 프로젝트에 복사한다. `.orcstack/check-no-sdd.mjs`가 프레임워크 산출물과 함께 설정 오류를 잡는다. orcstack을 갱신한 뒤 `guard`를 다시 실행하면 목록이 새로 쓰인다.

6. **갱신은 프로젝트 파일을 덮지 않는다.** `scaffold`는 `.orcstack/config.json`과 `.orcstack/README.md`가 없을 때만 만든다. `guard`는 자기가 설치하는 파일(`signals.mjs`, `extensions.mjs`, `catalog.json`, `check-no-sdd.mjs`)만 다시 쓴다.

## 버린 대안

- **파일 이름 규약만으로 선언** (예: `.orcstack/playbooks/bug-fix.md`가 있으면 대체): 설정 파일이 필요 없다. 하지만 확장인지 대체인지 파일만 보고 알 수 없고, 오타가 난 이름은 아무 일도 하지 않은 채 조용히 지나간다.
- **YAML 설정**: 사람이 쓰기 편하다. 하지만 orcstack 도구는 외부 의존성 없이 node만 쓴다(AGENTS.md).
- **skill마다 `.orcstack/`를 읽게 fork**: 슬래시로 직접 불러도 확장이 적용된다. 하지만 skill 53개를 fork해야 하고, fork 한도(15)를 이미 넘었다.
- **세션 훅으로 확장 주입**: oh-my-pi와 opencode에는 훅이 없다.

## 결과

- 🔒 `tests/extensions.test.mjs`가 다음을 막는다.
  - 끈 playbook이 해석 결과에서 빠지지 않는 경우
  - 대체 파일 대신 기본 파일을 가리키는 경우
  - 설정 오류(모르는 이름, 잠긴 항목, 없는 파일, `.orcstack/` 밖 경로, 이름 충돌)가 통과하는 경우
  - `scaffold`·`guard`를 다시 실행했을 때 설정과 확장 파일이 바뀌는 경우
- 확장은 `orc-mode`가 라우팅할 때 적용된다. 사용자가 슬래시로 skill을 직접 부르면 기본 skill이 그대로 실행된다. 이 한계는 `.orcstack/README.md`에 적는다.
- orcstack이 playbook을 지우거나 이름을 바꾸면 그 이름을 쓰던 프로젝트 설정은 `guard`에서 실패한다. 이름 변경은 CHANGELOG에 적는다.

## 재검토 조건

- 사용자가 슬래시로 직접 부른 skill에도 확장이 필요하다는 요구가 반복되면, 하네스의 훅이나 skill 래퍼를 다시 본다.
- 프로젝트가 skill 대체를 자주 쓰면 skill `replace`를 다시 본다.
- 확장 파일이 기본 playbook을 거의 다 다시 쓰는 경우가 많으면, playbook을 단계 단위로 확장하는 방식을 다시 본다.
