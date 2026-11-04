"""One-time builder: creates work/<key>.html project pages + home-page work layers.
Run from the WEBSITE folder. Project pages are NOT overwritten if they already exist
(so hand-written copy is never lost) unless --force is passed.
"""
import html, json, os, re, sys, time
STAMP = int(time.time())  # cache-buster for page assets

FORCE = "--force" in sys.argv
ROOT = os.getcwd()
data = json.load(open(os.path.join(ROOT, "site-data.json"), encoding="utf-8"))
# Films with "hideFromHome": true in site-data.json are left out of the home layers and prev/next links
films = [f for f in data["work_films"] if not f.get("hideFromHome")]

# Credits carried over from the archived work page (js/work.js articlesData)
CREDITS = {
    "project-genie": [("Client", "Google"), ("Role", "Editor"), ("Team", "Andrew Rhee|Jocelyn Zhao|Isabelle Winarto|Zach Velasco")],
    "genie-3": [("Client", "Google DeepMind"), ("Role", "Editor"), ("Team", "Andrew Rhee|Zach Velasco|JR Schmidt")],
    "dickies": [("Brand", "Dickies (Spec)"), ("Campaign", "Anywear"), ("Spots", "3"), ("Role", "Writer, Director, Editor"), ("Team", "Adelyne Ward|Ariela Hernandez")],
    "ibis": [("Brand", "Ibis Cycles (Spec)"), ("Director", "Scotch")],
    "harrys": [("Brand", "Harry’s (Spec)"), ("Director", "Scotch")],
    "byu-soccer": [("Client", "BYU Women’s Soccer"), ("Role", "Writer, Director"), ("Team", "Eli Corriveau")],
    "loophole": [("Event", "Loophole"), ("Director", "Scotch")],
    "tillamook": [("Brand", "Tillamook (Spec)"), ("Role", "Director, Editor"), ("Team", "Abe Tullis|Anna Partridge")],
    "pentax": [("Brand", "Pentax (Spec)"), ("Director", "Scotch"), ("Photography", "Scotch")],
    "north-face": [("Brand", "The North Face (Spec)"), ("Director", "Scotch"), ("Photography", "Scotch")],
}

e = lambda s: html.escape(s, quote=True)


def spots_for(f):
    ids = [s.strip() for s in (f.get("youtubeId") or "").split(",") if s.strip()]
    spots = [{"yt": i, "thumb": f"https://i.ytimg.com/vi/{i}/mqdefault.jpg"} for i in ids]
    if f.get("videoSrc"):
        spots.append({"src": "../" + f["videoSrc"], "thumb": "../" + f["poster"]})
    return spots


def player_html(f, spots):
    s = spots[0]
    if "yt" in s:
        return (f'<iframe src="https://www.youtube-nocookie.com/embed/{s["yt"]}?rel=0&amp;modestbranding=1" '
                f'title="{e(f["title"])}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>')
    return f'<video src="{s["src"]}" poster="../{f["poster"]}" controls playsinline preload="metadata"></video>'


def spots_html(spots):
    if len(spots) < 2:
        return ""
    btns = []
    for i, s in enumerate(spots):
        attr = f'data-youtube-id="{s["yt"]}"' if "yt" in s else f'data-video-src="{s["src"]}" data-poster="{s["thumb"]}"'
        active = " is-active" if i == 0 else ""
        btns.append(
            f'        <button type="button" class="project-spot{active}" role="tab" aria-selected="{str(i == 0).lower()}" {attr}>\n'
            f'          <img src="{s["thumb"]}" alt="" loading="lazy"><span>Spot {i + 1:02d}</span>\n'
            f'        </button>')
    return '\n      <div class="project-spots" role="tablist" aria-label="Campaign spots">\n' + "\n".join(btns) + "\n      </div>"


def page_html(i, f):
    spots = spots_for(f)
    prev_f = films[i - 1] if i > 0 else None
    next_f = films[i + 1] if i < len(films) - 1 else None
    credits = "\n".join(f"          <div><dt>{e(k)}</dt>" + "".join(f"<dd>{e(x)}</dd>" for x in v.split("|")) + "</div>" for k, v in CREDITS.get(f["key"], []))
    pager = ""
    if prev_f:
        pager += f'      <a class="prev" href="{prev_f["key"]}.html"><span>&larr; Previous</span>{e(prev_f["title"])}</a>\n'
    if next_f:
        pager += f'      <a class="next" href="{next_f["key"]}.html"><span>Next &rarr;</span>{e(next_f["title"])}</a>\n'

    return f'''<!DOCTYPE html>
<html lang="en" class="project-html">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{e(f["title"])} — {e(f["subtitle"])}">
  <title>{e(f["title"])} — SCOTCH</title>
  <link rel="stylesheet" href="../css/base.css?v={STAMP}">
  <link rel="stylesheet" href="../css/project.css?v={STAMP}">
</head>
<body class="project-page">

  <header class="project-header">
    <a href="../index.html" class="project-logo">SCOTCH</a>
    <a href="../index.html#work-{f["key"]}" class="project-back">Back</a>
  </header>

  <main class="project-main">
    <div class="project-grid">

      <!-- ================= LEFT: video + credits (stays in view) ================= -->
      <aside class="project-media">
        <div class="project-video" id="project-video">
          {player_html(f, spots)}
        </div>{spots_html(spots)}

        <!-- Credits: each <div> is one section (label + one <dd> per line) -->
        <dl class="project-credits">
{credits}
        </dl>
      </aside>

      <!-- ================= RIGHT: title, writing, images (scrolls) ================= -->
      <div class="project-story">
        <header class="project-titleblock">
          <h1 class="project-title">{e(f.get("pillTitle") or f["title"])}</h1>
        </header>

        <!-- ================= WRITING =================
             <p>Your writing…</p>
             <h2>Optional section heading</h2>
        ============================================== -->
        <article class="project-body">
        </article>

        <!-- ================= IMAGES (stacked, full column width) =================
             Copy a figure per image (click to enlarge):
               <figure class="project-figure">
                 <img src="../assets/media/your-image.jpg" alt="Describe the image">
                 <figcaption>Optional caption</figcaption>
               </figure>
        ======================================================================= -->
        <div class="project-images">
          <!-- PLACEHOLDERS: replace each gray box with a real image, e.g.
               <figure class="project-figure"><img src="../assets/media/your-image.jpg" alt="Describe the image"></figure> -->
          <div class="project-ph" aria-hidden="true"></div>
          <div class="project-ph" aria-hidden="true"></div>
        </div>

        <nav class="project-pager" aria-label="More work">
{pager}        </nav>
      </div>

    </div>
  </main>

  <footer class="project-footer">
    <span>SCOTCH &copy; 2026</span>
    <a href="mailto:lifeofscotch@gmail.com">lifeofscotch@gmail.com</a>
  </footer>

  <script src="../js/project.js?v={STAMP}"></script>
</body>
</html>
'''


def layer_html(i, f):
    # Hover preview: the film's main video (first YouTube ID), else its local file
    yt_first = next((s.strip() for s in (f.get("youtubeId") or "").split(",") if s.strip()), "")
    if yt_first:
        preview = f'data-preview-youtube="{yt_first}"'
    elif f.get("videoSrc"):
        preview = f'data-preview-src="{f["videoSrc"]}"'
    else:
        preview = ""
    return f'''      <section class="strata-layer work-layer" id="work-{f["key"]}" aria-label="Work: {e(f["title"])}" {preview}>
        <div class="plane-media">
          <img src="{f["poster"]}" alt="" loading="lazy">
        </div>
        <a class="work-layer-link" href="work/{f["key"]}.html" aria-label="View {e(f["title"])}"></a>
        <div class="work-pill">
          <h2 class="work-pill-title">{e(f.get("pillTitle") or f["title"])}</h2>
        </div>
      </section>
'''


# 1. Project pages
os.makedirs("work", exist_ok=True)
for i, f in enumerate(films):
    p = os.path.join("work", f'{f["key"]}.html')
    if os.path.exists(p) and not FORCE:
        print("skip (exists):", p)
        continue
    open(p, "w", encoding="utf-8").write(page_html(i, f))
    print("wrote", p)

# 2. Home layers (replaced between markers on every run)
idx = open("index.html", encoding="utf-8", newline="").read()
block = ("      <!-- WORK LAYERS:START (generated from site-data.json work_films) -->\n"
         '      <div id="work" class="work-anchor" aria-hidden="true"></div>\n'
         + "\n".join(layer_html(i, f) for i, f in enumerate(films))
         + "      <!-- WORK LAYERS:END -->\n\n")
if "WORK LAYERS:START" in idx:
    idx = re.sub(r"[ \t]*<!-- WORK LAYERS:START[\s\S]*?WORK LAYERS:END -->\r?\n\r?\n?", lambda m: block, idx)
else:
    anchor = re.search(r"[ \t]*<!-- =+\s*\r?\n\s*LAYER 07: INQUIRIES", idx)
    idx = idx[:anchor.start()] + block + idx[anchor.start():]
open("index.html", "w", encoding="utf-8", newline="").write(idx)
print("index.html: work layers updated")
