# fake-superpowers

orcstack 게이트 테스트용 fixture다. Superpowers의 감지 표지(`<EXTREMELY_IMPORTANT>`, `You have superpowers.`)와 skill 이름 두 개만 흉내 낸다. Superpowers 코드나 문서는 들어 있지 않다.

- 평소 회귀 확인은 이 fixture로 한다(`tests/e2e/gate.mjs`).
- 실제 Superpowers 확인은 Superpowers 릴리스가 부트스트랩이나 skill 이름을 바꿨을 때, 그리고 분기마다 감지 신호를 다시 측정할 때만 한다.
