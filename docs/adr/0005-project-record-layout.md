# ADR-0005: 프로젝트의 기존 기록 체계를 채택한다

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M3
- 근거: [synapse-backend 파일럿](../spikes/m3-7-pilot-synapse-backend.md) P1

## 맥락

orcstack은 SSOT를 `docs/planning/SSOT.md`, ADR을 `docs/adr/NNNN-slug.md`, brief를 `docs/briefs/`에 둔다고 가정했다. synapse-backend 파일럿에서 이 가정이 깨졌다.

- 그 저장소에는 SSOT 초안이 `docs/product/README.md`에 있고, 절 번호는 `## 1.` 형식이었다.
- ADR은 78개이고 3자리 번호와 `## Status` 절을 쓴다.
- `adopt-orcstack`은 SSOT를 하나 더 만들고 ADR 번호를 `0001`로 새로 시작했다. 그러자 cold-start 검토자가 "SSOT가 둘", "ADR 번호가 둘"을 모순으로 짚었다.

기록이 둘이 되면 orcstack이 막으려는 진실의 원천 분열(C5)을 orcstack이 직접 만든다.

## 결정

1. `.orcstack/config.json`에 `records`를 둔다. `ssot`(파일), `adr`(디렉터리), `briefs`(디렉터리)이고 모두 저장소 기준 상대 경로다. 없으면 기본값 `docs/planning/SSOT.md`, `docs/adr`, `docs/briefs`를 쓴다.
2. ADR 번호 자릿수는 설정하지 않고 기존 파일에서 추론한다. 가장 많이 쓰인 자릿수를 따르고, ADR이 없으면 4자리다.
3. 형식을 넓게 읽는다.
   - SSOT 절 제목: `## §3`과 `## 3.`
   - ADR 상태: `- 상태:` 줄과 `## Status` 절. 상태 값은 앞 단어만 본다(`Accepted (2026-11-05, …)`).
   - ADR 제목: `# ADR-078:`과 `# ADR-078 —`
4. `brief check --base`는 그 이후 추가·변경된 brief만 검사한다. 컷오버 전 다른 형식으로 쓴 brief는 고치지 않아도 된다.
5. `adopt-orcstack detect`가 기존 SSOT 후보와 ADR 번호 체계를 보고한다. 에이전트는 `scaffold` 전에 `records`를 쓴다. `scaffold`는 그 경로를 따르고, 컷오버 ADR은 기존 번호를 잇는다.
6. 설치되는 guard는 `records` 형식 오류도 잡는다.

## 버린 대안

- **orcstack 경로로 옮기기**(기존 SSOT·ADR을 `docs/planning/`, 4자리 번호로 이동): 링크 수백 개가 끊기고, 팀이 익숙한 위치가 바뀐다. 이동 자체가 컷오버의 위험이 된다.
- **ADR 자릿수를 설정으로 받기**: 설정이 기존 파일과 어긋날 수 있다. 파일에서 추론하면 어긋날 일이 없다.
- **brief 형식 강제**(기존 brief를 모두 새 형식으로 고치기): 동결된 기록을 고치게 된다. `--base`로 새 brief만 본다.

## 결과

- 🔒 `tests/records.test.mjs`가 다음을 막는다.
  - `records`의 기본값과 오류
  - SSOT 후보와 ADR 번호 보고
  - 설정한 SSOT와 `## 1.` 절을 따르는 brief 생성
  - `--base` 검사
  - 기존 자릿수를 잇는 ADR 생성
  - `## Status` 형식 읽기와 supersede
  - 설정한 SSOT를 읽는 inventory
  - 두 번째 SSOT를 만들지 않는 `scaffold`와 기존 번호를 잇는 컷오버 ADR
- `AGENTS.md` orcstack 블록은 `records` 경로와 실제 컷오버 ADR 경로를 쓴다.

## 재검토 조건

- 한 저장소에 SSOT가 여러 파일로 나뉘어 있어 `ssot` 하나로 가리킬 수 없는 경우가 나오면 다시 본다.
- 3·4자리 말고 다른 ADR 이름 규칙(날짜 접두사 등)을 쓰는 저장소가 나오면 다시 본다.
