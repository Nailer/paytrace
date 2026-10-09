import sys, json, asyncio, certifi
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts
async def one(k, text):
    c = edge_tts.Communicate(text, "en-US-AndrewNeural", rate="+4%", boundary="WordBoundary")
    words=[]
    with open(f"vo/{k}.mp3","wb") as f:
        async for ch in c.stream():
            if ch["type"]=="audio": f.write(ch["data"])
            elif ch["type"]=="WordBoundary": words.append([ch["offset"]/1e7, (ch["offset"]+ch["duration"])/1e7, ch["text"]])
    json.dump(words, open(f"vo/{k}.json","w"))
s=json.load(open("script.json"))
async def main():
    for k,v in s.items(): await one(k,v)
asyncio.run(main())
