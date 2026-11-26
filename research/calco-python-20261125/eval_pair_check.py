"""Compare the current candidate with optional parallel-face pruning, never certify unlabelled inputs."""
import csv,json
from pathlib import Path
import cv2 as cv
import numpy as np
from wall_enclosed import select_enclosed_mode
from refine_caps import attached_stubs
from wall_pair_check import prune_alternative
from regression_gate import scores

def evaluate(manifest,out):
    path=Path(manifest);out=Path(out);out.mkdir(parents=True,exist_ok=True);rows=[]
    for item in csv.DictReader(path.open(encoding='utf-8-sig')):
        row={'id':item['id'],'status':'UNVERIFIED'}
        try:
            im=cv.imread(str(path.parent/item['image']));prior=cv.imread(str(path.parent/item['previous_mask']),0);ppm=float(item['ppm'])
            if im is None or prior is None or prior.shape!=im.shape[:2]:raise ValueError('Invalid image or prior mask')
            base=(prior<128).astype(np.uint8);alt,meta=select_enclosed_mode(im,ppm,base);base=attached_stubs(im,ppm,alt if meta['recommend_review'] else base)
            candidate,counts=prune_alternative(im,ppm,base);row.update(counts)
            if item.get('reference'):
                ref=cv.imread(str(path.parent/item['reference']),0)
                if ref is None or ref.shape!=base.shape:raise ValueError('Invalid reference')
                ref=ref<128;row['before']=scores(base,ref);row['after']=scores(candidate,ref);row['status']='REVIEW';row['regression']=row['after']['iou']<row['before']['iou']
                for name,mask in [('before',base),('after',candidate),('reference',ref)]:cv.imwrite(str(out/f"{item['id']}_{name}.png"),255*(1-mask.astype(np.uint8)))
        except Exception as e:row.update(status='ERROR',error=str(e))
        rows.append(row)
    (out/'report.json').write_text(json.dumps(rows,indent=2));return rows
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('out');a=p.parse_args();rows=evaluate(a.manifest,a.out);print('cases',len(rows),'errors',sum(r['status']=='ERROR' for r in rows),'changed',sum(r.get('removed',0)>0 for r in rows));print(*[r for r in rows if 'before' in r],sep='\n')
