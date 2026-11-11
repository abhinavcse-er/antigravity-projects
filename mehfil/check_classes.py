f = open(r"C:\Users\abhin\.gemini\antigravity\scratch\mehfil\client\index.html", encoding="utf-8").read()
print("main-play:", "main-play" in f)
print("small-control:", "small-control" in f)
print("play-button:", "play-button" in f)

# Show the player controls section
start = f.find("PLAYER CONTROLS")
print("\nPlayer controls section:")
print(f[start:start+800])
