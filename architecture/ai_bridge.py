"""Optional server-side LLM interpretation; never imported by the public browser.

Configure ARQ_OPENAI_MODEL and OPENAI_API_KEY on the server only.
Run: python architecture/ai_bridge.py < instruction.txt
No API call is made unless the program is explicitly invoked.
"""
import json
import os
import sys
import urllib.request
from solver import CATALOG, solve, solve_suite_row

def field(t):
    return {"type":[t,"null"]}

SCHEMA={
 "type":"object","additionalProperties":False,
 "properties":{
    "kind":{"type":"string","enum":["bedroom","bathroom","kitchen","living","suite_row","unsupported"]},
    "count":{"type":"integer"},"width":field("number"),"depth":field("number"),
    "wall":field("number"),"door":field("number"),"window":field("number"),
    "bathWidth":field("number"),"bathDepth":field("number"),
    "fixtures":{"type":["array","null"],"items":{"type":"string","enum":list(CATALOG)}},
    "bathFixtures":{"type":["array","null"],"items":{"type":"string","enum":list(CATALOG)}},
    "assumptions":{"type":"array","items":{"type":"string"}},
    "unsupported":{"type":"array","items":{"type":"string"}}
 },
 "required":["kind","count","width","depth","wall","door","window","bathWidth","bathDepth",
             "fixtures","bathFixtures","assumptions","unsupported"]
}
INSTRUCTIONS="""You are the architectural brief interpreter for CAD2D3D. Understand requests in any
language. Return only the structured brief, all dimensions in metres. Never return code or invented
catalog identifiers. Supported layouts: one rectangular bedroom, bathroom, kitchen, living room;
or several identical rooms in a row; or bedrooms in a row each with its own full-width bathroom
behind it (suite_row). Bedroom dimensions are clear bedroom dimensions excluding the bathroom.
An unqualified request for one bedroom with bathroom is suite_row count 1. If a user wants the
entire suite within a specified envelope, a different bathroom width, irregular shape, corridor,
mixed unrelated rooms, unsupported objects or another unsupported constraint, list it in unsupported.
Do not silently discard explicit requirements. For missing dimensions use sensible initial values
and disclose them in assumptions in the user's language. For unspecified fixtures use null (defaults).
Use bathtub for a bath with tub and include toilet, bidet and basin unless the user excludes them.
Do not claim code compliance or accessibility. No drawing coordinates; the geometry solver owns them.
"""

def interpret_ai(instruction):
    if not isinstance(instruction,str) or not instruction.strip() or len(instruction)>4000:
        raise ValueError("Invalid or too long architectural instruction.")
    key=os.environ.get("OPENAI_API_KEY")
    model=os.environ.get("ARQ_OPENAI_MODEL")
    if not key or not model:
        raise RuntimeError("AI provider not configured on server.")
    payload={"model":model,"instructions":INSTRUCTIONS,"input":instruction,"store":False,
             "max_output_tokens":1400,
             "text":{"format":{"type":"json_schema","name":"architectural_brief","strict":True,"schema":SCHEMA}}}
    req=urllib.request.Request("https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=25) as response:
        data=json.load(response)
    if data.get("status")!="completed":
        raise RuntimeError("AI did not complete the brief.")
    chunks=[p["text"] for item in data.get("output",[]) if item.get("type")=="message"
            for p in item.get("content",[]) if p.get("type")=="output_text"]
    if not chunks: raise ValueError("No architectural brief returned.")
    return json.loads("".join(chunks))

def compile_brief(brief):
    if not isinstance(brief,dict) or brief.get("unsupported") or brief.get("kind")=="unsupported":
        raise ValueError("Unsupported architectural requirements: "+str(brief.get("unsupported",[]) if isinstance(brief,dict) else []))
    spec={k:v for k,v in brief.items() if v is not None and k not in ("unsupported",)}
    kind=spec.get("kind")
    if kind=="suite_row":
        # Current suite generator has fixed opening dimensions and bedroom fixtures.
        if spec.get("door",.8)!=.8 or spec.get("window",1.2)!=1.2 or spec.get("fixtures") is not None:
            raise ValueError("Custom suite openings or bedroom fixtures are not supported yet.")
        result=solve_suite_row(spec)
    else: result=solve(spec)
    result["brief"]=spec
    result["assumptions"]=spec.get("assumptions",[])
    return result

if __name__=="__main__":
    print(json.dumps(compile_brief(interpret_ai(sys.stdin.read())),ensure_ascii=False))
