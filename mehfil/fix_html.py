"""Fix index.html — apply all CSS class corrections at once."""

html_path = r"C:\Users\abhin\.gemini\antigravity\scratch\mehfil\client\index.html"

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Fix sidebar: add sidebar-title, correct mood icons, fix surprise button
old_sidebar = '''            <!-- MOOD SIDEBAR -->
            <aside class="mood-sidebar">
                <button class="mood-button active" data-mood="love">
                    <span class="mood-icon"><i class="fa-solid fa-heart"></i></span>
                    <span class="mood-name">LOVE</span>
                </button>

                <button class="mood-button" data-mood="dard">
                    <span class="mood-icon"><i class="fa-solid fa-cloud-rain"></i></span>
                    <span class="mood-name">DARD</span>
                </button>

                <button class="mood-button" data-mood="sukoon">
                    <span class="mood-icon"><i class="fa-solid fa-feather"></i></span>
                    <span class="mood-name">SUKOON</span>
                </button>

                <button class="mood-button" data-mood="safar">
                    <span class="mood-icon"><i class="fa-solid fa-car"></i></span>
                    <span class="mood-name">SAFAR</span>
                </button>

                <button class="mood-button" data-mood="happy">
                    <span class="mood-icon"><i class="fa-solid fa-face-smile"></i></span>
                    <span class="mood-name">HAPPY</span>
                </button>

                <button class="mood-button" data-mood="late-night">
                    <span class="mood-icon"><i class="fa-solid fa-moon"></i></span>
                    <span class="mood-name">LATE NIGHT</span>
                </button>

                <button class="surprise-button" id="surpriseButton">
                    <i class="fa-solid fa-dice"></i>
                    <span>SURPRISE ME</span>
                </button>
            </aside>'''

new_sidebar = '''            <!-- MOOD SIDEBAR -->
            <aside class="mood-sidebar">
                <div class="sidebar-title">CHOOSE YOUR MOOD</div>

                <button class="mood-button active" data-mood="love">
                    <span class="mood-icon love-icon"><i class="fa-solid fa-heart"></i></span>
                    <span class="mood-name">LOVE</span>
                </button>

                <button class="mood-button" data-mood="dard">
                    <span class="mood-icon dard-icon"><i class="fa-solid fa-heart-crack"></i></span>
                    <span class="mood-name">DARD</span>
                </button>

                <button class="mood-button" data-mood="sukoon">
                    <span class="mood-icon sukoon-icon"><i class="fa-solid fa-spa"></i></span>
                    <span class="mood-name">SUKOON</span>
                </button>

                <button class="mood-button" data-mood="safar">
                    <span class="mood-icon safar-icon"><i class="fa-solid fa-road"></i></span>
                    <span class="mood-name">SAFAR</span>
                </button>

                <button class="mood-button" data-mood="happy">
                    <span class="mood-icon happy-icon"><i class="fa-solid fa-sun"></i></span>
                    <span class="mood-name">HAPPY</span>
                </button>

                <button class="mood-button" data-mood="late-night">
                    <span class="mood-icon night-icon"><i class="fa-solid fa-moon"></i></span>
                    <span class="mood-name">LATE NIGHT</span>
                </button>

                <button class="surprise-button" id="surpriseButton">
                    <span class="surprise-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                    <span>
                        <strong>Surprise Me</strong>
                        <small>Mehfil will decide</small>
                    </span>
                </button>
            </aside>'''

if old_sidebar in html:
    html = html.replace(old_sidebar, new_sidebar)
    print("✅ Fixed sidebar")
else:
    print("❌ sidebar block not found — check whitespace")

# 2. Fix center section class: "center" -> "center-content"
old_center_open = '            <section class="center">'
new_center_open = '            <section class="center-content">'
if old_center_open in html:
    html = html.replace(old_center_open, new_center_open)
    print("✅ Fixed center-content class")
else:
    print("❌ center section not found")

# 3. Fix mood-intro: add YOU ARE IN span, change <a> to <button>
old_mood_intro = '''                <!-- MOOD INTRO -->
                <div class="mood-intro">
                    <h2 id="moodTitle">LOVE</h2>
                    <p id="moodQuote">\u201cPyaar ke gaane, dil se dil tak.\u201d</p>
                    <a href="#explore" id="moodAction" class="mood-action">WHY LOVE?</a>
                </div>'''

new_mood_intro = '''                <!-- MOOD INTRO -->
                <div class="mood-intro">
                    <span class="you-are">YOU ARE IN</span>
                    <h2 id="moodTitle">LOVE</h2>
                    <p id="moodQuote">\u201cPyaar ke gaane, dil se dil tak.\u201d</p>
                    <button id="moodAction" class="mood-action">WHY LOVE? <i class="fa-solid fa-arrow-right"></i></button>
                </div>'''

if old_mood_intro in html:
    html = html.replace(old_mood_intro, new_mood_intro)
    print("✅ Fixed mood-intro")
else:
    print("❌ mood-intro not found")

# 4. Add live-message after player-card and close section properly
old_section_close = '''                </div>

            </section>

            <!-- RIGHT SIDEBAR -->'''

new_section_close = '''                </div>

                <!-- LIVE MESSAGE -->
                <div class="live-message">
                    <span class="live-pulse"></span>
                    <span>You\u2019re listening with <strong id="centerListeners">1,240</strong> others right now</span>
                </div>

            </section>

            <!-- RIGHT SIDEBAR -->'''

if old_section_close in html:
    html = html.replace(old_section_close, new_section_close)
    print("✅ Added live-message")
else:
    print("❌ section close block not found")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("\nDone! index.html updated.")
