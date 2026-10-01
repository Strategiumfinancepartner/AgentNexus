import os,sys,json,base64,subprocess,requests
G="https://connector-gateway.lovable.dev/github"
H={"Authorization":"Bearer "+os.environ["LOVABLE_API_KEY"],"X-Connection-Api-Key":os.environ["GITHUB_API_KEY"],"Accept":"application/vnd.github+json"}
R="/repos/Strategiumfinancepartner/AgentNexus"
def call(m,p,b=None):
    r=requests.request(m,G+R+p,headers=H,json=b,timeout=60)
    if r.status_code>=300: print(m,p,r.status_code,r.text[:300]); sys.exit(1)
    return r.json()
files=[f for f in subprocess.check_output(["git","ls-files"],cwd="/dev-server").decode().split("\n") if f and not f.startswith((".env",".lovable/")) and f!="roadmap.md"]
parent=call("GET","/git/ref/heads/main")["object"]["sha"]
tree=[]
from concurrent.futures import ThreadPoolExecutor
def blob(f):
    d=open("/dev-server/"+f,"rb").read()
    s=call("POST","/git/blobs",{"content":base64.b64encode(d).decode(),"encoding":"base64"})["sha"]
    mode="100755" if os.access("/dev-server/"+f,os.X_OK) else "100644"
    return {"path":f,"mode":mode,"type":"blob","sha":s}
with ThreadPoolExecutor(8) as ex: tree=list(ex.map(blob,files))
t=call("POST","/git/trees",{"tree":tree})["sha"]
c=call("POST","/git/commits",{"message":"Sync from Agent Nexus project","tree":t,"parents":[parent]})["sha"]
call("PATCH","/git/refs/heads/main",{"sha":c})
print("ok",len(files),c)
