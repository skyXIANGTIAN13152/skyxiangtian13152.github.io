# Sky 天 · Personal Website

[中文](README.zh-CN.md) · [Repository home](README.md) · [Visit the website](https://skyxiangtian13152.github.io/)

This is Sky 天’s interactive personal website, inspired by the manor in *Identity V*. Visitors choose a character on the cover, enter a 3D lobby through a Muse Mark transition, and explore personal pages through entrances in the room. Game scenes, characters, sound and animations have been adapted for the browser, so the result may differ from the original game.

## Explore

- **About:** personal profile, education and contact details.
- **Studies:** academic background and courses at UNSW.
- **Projects:** personal projects, GitHub links and interactive demonstrations.
- **Interests, Games and GitHub picks:** hobbies, games and recommended GitHub projects.
- **People, Pet House and Life journey:** spaces for people, pets and personal stories.

Content can change when the owner publishes an update; some sections may not yet have entries. The website supports Chinese and English, and guests can browse without an account.

## Controls

- Choose a visitor on the cover and enter the lobby. The female visitor can switch hood styles in the lobby. Return to the cover to change visitors.
- On desktop, move with **W, A, S, D** or the arrow keys, drag to look around, and use **Q / R** to rotate the view. Press **E** near an entrance to read.
- On mobile, use the movement joystick and read button. Landscape orientation provides a larger view.
- Sound is enabled by default and can be turned off using the sound control. Some browsers allow audio only after a click, tap or key press; lobby music begins after the Muse transition finishes.

## Local preview

The `dist/` folder contains the static site. With Node.js 20 or later installed, run from the repository root:

```bash
npm start
```

Open <http://127.0.0.1:4173/> and press `Ctrl+C` to stop. If the port is in use, try `npm start -- 4174`. No package installation is needed for this static preview. Use the local server to load browser assets correctly; the standalone preview does not provide the owner’s backend.

```bash
npm run check
```

This checks static asset references and JavaScript syntax.

## Content management and deployment

Guests read published content. The owner can sign in with GitHub through the [management panel](https://sky-tian-manor-portfolio.perky-berry-1262.chatgpt.site/admin/) to edit content, save drafts, preview and publish. The panel depends on a separate backend; this static repository is not the complete management service. See [OWNER-EDITOR.md](OWNER-EDITOR.md) for the owner guide.

Changes pushed to `main` trigger GitHub Actions to check and deploy `dist/` to GitHub Pages. The connected EdgeOne Pages project also deploys from that branch; see [EDGEONE-DEPLOY.md](EDGEONE-DEPLOY.md) for its configuration.

| Path | Purpose |
| --- | --- |
| `dist/` | Published static site, assets and public content snapshot |
| `scripts/` | Local preview and static checks |
| `.github/workflows/pages.yml` | GitHub Pages deployment workflow |
| `OWNER-EDITOR.md` | Owner management and maintenance guide |
| `THIRD_PARTY_NOTICES.md`, `licenses/` | Third-party asset credits and licence information |

## Assets and rights

The *Identity V* name, characters, scenes, music and other game assets belong to their respective rights holders. Other third-party content is subject to its own licences. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/`. Public access to this repository does not itself grant permission to reuse third-party assets.
