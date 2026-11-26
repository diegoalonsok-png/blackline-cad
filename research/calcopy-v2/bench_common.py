import cv2,numpy as np,glob
BASE='/home/claude/blackline-cad/assets/architecture-references/house/unverified/user-drive-20261125-'
def load(k):
    im=cv2.imread(BASE+k+'.jpg');return im
def sheet(imgs,T=420,cols=6,out='sheet.jpg'):
    rows=(len(imgs)+cols-1)//cols;S=np.full((rows*T,cols*T,3),255,np.uint8)
    for i,(name,im) in enumerate(imgs):
        if im.ndim==2: im=cv2.cvtColor(im,cv2.COLOR_GRAY2BGR)
        h,w=im.shape[:2];s=min(T/w,T/h);im=cv2.resize(im,(int(w*s),int(h*s)),interpolation=cv2.INTER_AREA)
        y,x=(i//cols)*T,(i%cols)*T;S[y:y+im.shape[0],x:x+im.shape[1]]=im
        cv2.putText(S,name,(x+4,y+16),cv2.FONT_HERSHEY_SIMPLEX,.5,(0,120,0),1)
    cv2.imwrite(out,S,[cv2.IMWRITE_JPEG_QUALITY,80])
KEYS=['%02d'%i for i in range(1,19)]
