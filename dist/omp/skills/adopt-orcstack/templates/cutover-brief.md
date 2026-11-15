# Brief: orcstack으로 운영 규칙 전환

- SSOT: (이 전환이 지키는 SSOT 절. 예: 지켜야 할 계약 절. 채운 뒤 `work-brief check`를 돌린다)
- 작업 항목: 컷오버 (<milestone>)
- 날짜: <date>
- 결정: `<cutover-adr>`

## 무엇을, 왜

이전 운영 규칙(<frameworks>)과 orcstack을 함께 쓰면 작업 순서와 권위 문서가 둘이 된다. <milestone> 경계에서 전환한다. 이 저장소의 어떤 사용자·팀 필요와 실패 비용 때문에 지금 전환하는지 두세 문장으로 적는다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 다른 프레임워크 산출물이 동결 위치 밖에 없다 | 새 SDD·Spec Kit·Superpowers 문서, pstack's `poteto-mode` 라우팅 지시 | 🔒 `orcstack-guard` CI (`.orcstack/check-no-sdd.mjs`) |
| A2 | 에이전트 라우팅이 `orc-mode` 하나다 | 라우팅 지시가 둘 | 🔒 `orcstack-guard`(지시 파일의 다른 라우터 지시), 📎 `AGENTS.md` 교체 전후 |
| A3 | 제품 의도가 SSOT에 있고 소유자가 승인했다 | 동결 문서에만 있는 의도 | 📎 SSOT 소유자 승인 |
| A4 | 프레임워크 플러그인이 꺼져 있다 | 세션 시작 때 다른 부트스트랩 | 📎 `.claude/settings.json`, 수동 제거 목록 |

## 동결한 것

<frozen>

## 되돌리기

- 범위: 컷오버 PR을 되돌리면 동결 이동, `AGENTS.md` 블록, 플러그인 설정, guard가 함께 되돌아간다. 데이터나 외부 계약은 바뀌지 않는다.
- 먼저 확인할 것: 컷오버 뒤에 쓴 brief·ADR이 orcstack 경로를 가리키는지, git이 무시해 로컬에 남긴 문서(`freeze`의 `leftIgnored`), 동결로 끊긴 참조(`freeze`의 `references`).
- 절차: 컷오버 커밋을 `git revert`하고 이전 프레임워크 플러그인을 다시 켠다. 그 사이 쓴 orcstack 기록은 지우지 않고 이전 규칙의 문서로 옮긴다.

## 남은 위험

guard가 없는 항목(A3, A4)은 컷오버 PR의 리뷰와 첫 마일스톤 cold-start 검토로 확인한다.
