import urllib.request
html = urllib.request.urlopen("http://localhost:3000/").read().decode("utf-8")
checks = [
    "center-content","sidebar-title","you-are","live-message","live-pulse",
    "main-play","small-control","surprise-icon","heart-crack","fa-spa","fa-road",
    "fa-sun","wand-magic-sparkles","centerListeners","moodAction"
]
all_ok = True
for c in checks:
    if c in html:
        print(f"OK: {c}")
    else:
        print(f"MISSING: {c}")
        all_ok = False
print()
print("ALL CHECKS PASSED!" if all_ok else "Some classes are missing!")
