# Brief: Tier 0 구조 게이트 (validate, check-no-sdd)

- SSOT: §6 C1·C2·C5·C6
- 작업 항목: M1-7
- 날짜: 2026-11-06

## 무엇을, 왜

모든 push·PR에서 2분 안에 도는 구조 게이트를 만든다. 계약 C1(토큰·Cursor 잔존 없음), C2(출처 고지), C5(다른 프레임워크 산출물 없음), C6(`dist/` 최신)을 가장 낮은 층(정적 검사)에서 막는다.

- `tools/validate.mjs`: sync 설정, 하네스 표, 출처 고지, SKILL.md frontmatter, 상대 링크, `src/` denylist 잔존, `dist/` 최신 여부
- `tools/check-no-sdd.mjs`: [감지 신호](../spikes/framework-signals.md)의 "저장소 파일" 표와 프로젝트 설정의 플러그인 활성 여부. `docs/archive/`는 면제
- `npm run tier0` = validate + check-no-sdd, `npm run check` = tier0 + 테스트

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | SDD·Spec Kit·Superpowers 산출물과 켜진 플러그인을 경로로 찾고, `docs/archive/`는 면제한다 | 문서 본문에 경로가 언급됐다는 이유로 오탐 | 🔒 unit 5개 |
| A2 | 이 저장소에 `specs/x/requirements.md`를 추가하면 tier0가 실패한다 | SDD 문서가 조용히 머지됨 | 🔒 e2e + 📎 아래 로그 |
| A3 | 깨진 상대 링크를 찾고, 외부 링크·앵커·코드 안의 링크는 무시한다 | 문서 이동 후 죽은 링크 | 🔒 unit |
| A4 | `src/skills/<name>/SKILL.md`의 frontmatter `name`이 폴더 이름과 같고 description이 있다 | 하네스가 skill을 못 찾음 | 🔒 unit |
| A5 | LICENSE의 Lauren Tan 고지와 NOTICE의 pin이 없으면 실패한다 | 출처 고지 삭제(C2) | 🔒 unit |
| A6 | `src/` Markdown에 denylist 잔존이 있으면 경로·줄·규칙과 함께 실패한다 | Cursor 전제가 배포본에 남음(C1) | 🔒 e2e |
| A7 | `dist/`가 빌드 결과와 다르면 실패한다 | 손으로 고친 배포본(C6) | 🔒 e2e |
| A8 | `npm run check` 전체가 2분 안에 끝난다 | 느린 게이트 | 📎 로컬 약 2초(69개 테스트 포함) |

## A2 로그 (2026-11-06)

```
$ mkdir -p specs/x && echo "# req" > specs/x/requirements.md && npm run tier0
validate: ok
sdd	specs/x/requirements.md	(file)

1 artifacts of frameworks that cannot be mixed with orcstack. Move frozen documents to docs/archive/<framework>/ or remove them.
exit=1
```

## 남은 위험

- 감지 신호는 2026-11-05 기준 버전(Superpowers 7.0.2, Spec Kit 1.3.1.dev0)에서 측정했다. 프레임워크가 경로를 바꾸면 놓친다. 주간 sync와 별개로 분기마다 감지 신호를 다시 측정한다(M5에서 운영 항목으로 넣는다).
- 유저 전역 설정(`~/.claude/settings.json`)은 저장소 밖이라 검사하지 않는다. 런타임 게이트(`orc-mode`, M3-2)가 맡는다.
