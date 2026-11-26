import cv2 as cv, numpy as np, json, math
from pathlib import Path
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
ROOT=Path('/mnt/data/ensayos_3')
def extract(gray,wall,o,ppm):
    a,b=np.array(wall['a']),np.array(wall['b']); u=(b-a)/np.linalg.norm(b-a); c=a+u*o['offset']; n=np.array([-u[1],u[0]])
    # Pixel samples along reviewed opening axis; retain original resolution.
    X=np.linspace(-o['width']/2,o['width']/2,max(12,round(o['width']*ppm)))
    Y=np.linspace(-.18,.18,max(9,round(.36*ppm)))
    p=c[None,None,:]+X[None,:,None]*u+Y[:,None,None]*n
    patch=cv.remap(gray,(p[:,:,0]*ppm).astype('float32'),(gray.shape[0]-p[:,:,1]*ppm).astype('float32'),cv.INTER_LINEAR,borderMode=cv.BORDER_CONSTANT,borderValue=255)
    return patch

def detect(patch):
    h,w=patch.shape
    if w<28:return {'divisions':[], 'status':'review: resolution'}
    ink=(255-patch.astype(float))/255
    baseline=np.median(ink[:,int(w*.12):int(w*.88)],axis=1)
    # Use only rows containing the longitudinal frame; exclude neighboring tile grids.
    rows=np.flatnonzero(baseline>.18)
    if len(rows)<2:return {'divisions':[],'status':'review: frame unclear'}
    groups=np.split(rows,np.flatnonzero(np.diff(rows)>4)+1)
    group=max(groups,key=lambda z:baseline[z].sum())
    lo=max(0,group.min()-2);hi=min(h,group.max()+3)
    excess=np.maximum(0,ink[lo:hi]-baseline[lo:hi,None])
    signal=gaussian_filter1d(excess.sum(axis=0),max(.65,w/220))
    peaks,props=find_peaks(signal,prominence=max(.45,.08*(hi-lo)),distance=max(3,w*.16))
    found=[int(p) for p in peaks if .22<p/w<.78 and signal[p]>=max(.65,.12*(hi-lo))]
    # Visible divisions only. Their absence is never evidence for one leaf.
    return {'divisions':[round(p/(w-1),3) for p in found],'status':'candidate' if found else 'review: no explicit divisions','peak_strength':[round(float(signal[p]),2) for p in found]}
if __name__=='__main__':
 for n in [17,31,46]:
    d=json.loads((ROOT/f'ref{n}.json').read_text());g=cv.imread(str(ROOT/f'ref{n}.png'),0);ppm=d['scale']['pixelsPerUnit'];
    for i,o in enumerate(d['openings']):
      if o['kind']!='framed-window':continue
      w=next(w for w in d['walls'] if w['id']==o['host']);p=extract(g,w,o,ppm);print(n,i,p.shape,detect(p))

def synthetic(w,divisions,contrast=35,offset=0):
    p=np.full((36,w),255,np.uint8);y=18+offset
    cv.line(p,(0,y-4),(w-1,y-4),contrast,1);cv.line(p,(0,y+4),(w-1,y+4),contrast,1)
    for x in [0,w-1]+[round(v*(w-1)) for v in divisions]:cv.line(p,(x,y-4),(x,y+4),contrast,2)
    return p