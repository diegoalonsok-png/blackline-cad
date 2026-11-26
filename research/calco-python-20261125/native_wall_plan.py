"""Build a native CAD architecture plan from reviewed wall axes and openings.
The CAD engine creates WALL entities and cuts both faces using parametric blocks.
Coordinates are in metres. No guessed openings or forced nominal thickness.
"""
import math

def build_plan(walls, openings=()):
    result=dict(schema='blackline.architecture.v1',units='m',walls=[],openings=[],blocks=[],rooms=[],virtualDimensions=[],brief={'kind':'trace_reviewed'},traceReviewed=True)
    hosts={}
    for w in walls:
        key=w['id']; a,b=[list(map(float,w[k])) for k in ('a','b')]; t=float(w['thickness'])
        if key in hosts or len(a)!=2 or len(b)!=2 or not all(map(math.isfinite,a+b+[t])) or not .08<=t<=.5 or math.dist(a,b)<=.1:
            raise ValueError('Invalid wall '+str(key))
        row=dict(id=key,a=a,b=b,thickness=t,layer='WALLS',join='native')
        hosts[key]=row; result['walls'].append(row)
    intervals={key:[] for key in hosts}
    for o in openings:
        key=o['host']; w=hosts[key]; L=math.dist(w['a'],w['b']); width=float(o['width']); offset=float(o['offset']); kind=o['kind']
        if kind not in ('swing-door','double-door','framed-window') or not math.isfinite(offset) or not .3<=width<=5:
            raise ValueError('Invalid opening')
        lo,hi=offset-width/2,offset+width/2
        if lo<=w['thickness']/2 or hi>=L-w['thickness']/2 or any(lo<=b and hi>=a for a,b in intervals[key]):
            raise ValueError('Opening outside or overlapping host '+str(key))
        intervals[key].append((lo,hi))
        row=dict(host=key,kind=kind,offset=offset,width=width,layer='WINDOWS' if kind=='framed-window' else 'DOORS')
        if 'orientation' in o:row['orientation']=dict(o['orientation'])
        result['openings'].append(row)
    return result

def self_test():
    for thickness in (.10,.15,.20,.30):
        walls=[dict(id='w',a=[0,0],b=[6,0],thickness=thickness),dict(id='t',a=[2,0],b=[2,3],thickness=thickness)]
        openings=[dict(host='w',kind='swing-door',offset=1,width=.8),dict(host='w',kind='framed-window',offset=4,width=1.2)]
        plan=build_plan(walls,openings)
        assert len(plan['walls'])==2 and len(plan['openings'])==2
        assert plan['walls'][0]['b']==[6,0] and plan['walls'][0]['thickness']==thickness
        for invalid in [dict(host='w',kind='swing-door',offset=.1,width=.8),dict(host='w',kind='framed-window',offset=1.1,width=.8)]:
            try:build_plan(walls,openings+[invalid])
            except ValueError:pass
            else:raise AssertionError('Invalid opening accepted')
    print('4 thicknesses: continuous WALL hosts, 8 valid openings, 8 invalid openings rejected')

if __name__=='__main__':self_test()
