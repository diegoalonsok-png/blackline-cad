"""Regression evaluator; unannotated images are never counted as accuracy passes.
Manifest CSV columns: id,image,reference,ppm,previous_mask. Paths relative to CSV.
All references must be independent, manually verified binary masks (black=wall).
"""
import argparse,csv,json
from pathlib import Path
import cv2 as cv
import numpy as np
from wall_enclosed import select_enclosed_mode
from refine_caps import attached_stubs

def scores(mask,ref):
    m=mask.astype(bool);r=ref.astype(bool)
    tp=int((m&r).sum());fp=int((m&~r).sum());fn=int((~m&r).sum())
    return dict(tp=tp,fp=fp,fn=fn,precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn),iou=tp/max(1,tp+fp+fn))

def evaluate(manifest):
    path=Path(manifest);rows=[]
    for item in csv.DictReader(path.open(encoding='utf-8-sig')):
        row={'id':item['id'],'status':'ERROR'}
        try:
            im=cv.imread(str(path.parent/item['image']));prior=cv.imread(str(path.parent/item['previous_mask']),0)
            if im is None or prior is None or prior.shape!=im.shape[:2]:raise ValueError('image/mask missing or different size')
            ppm=float(item['ppm']);base=(prior<128).astype(np.uint8)
            alt,meta=select_enclosed_mode(im,ppm,base);selected=alt if meta['recommend_review'] else base
            candidate=attached_stubs(im,ppm,selected)
            row.update(status='UNVERIFIED',selected_enclosed=meta['recommend_review'],added=int((candidate&~selected).sum()))
            if item.get('reference'):
                r=cv.imread(str(path.parent/item['reference']),0)
                if r is None or r.shape!=base.shape:raise ValueError('reference missing or different size')
                ref=r<128;before=scores(selected,ref);after=scores(candidate,ref)
                row.update(before=before,after=after,status='PASS' if after['fp']==after['fn']==0 else 'REVIEW',regression=after['iou']+1e-12<before['iou'])
        except Exception as e:row.update(status='ERROR',error=str(e))
        rows.append(row)
    return dict(total=len(rows),annotated=sum('after' in r for r in rows),exact=sum(r['status']=='PASS' for r in rows),regressions=sum(r.get('regression',False) for r in rows),errors=sum(r['status']=='ERROR' for r in rows),certified=False,results=rows)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('--out',required=True);a=p.parse_args()
    report=evaluate(a.manifest);Path(a.out).write_text(json.dumps(report,indent=2));print({k:v for k,v in report.items() if k!='results'})
