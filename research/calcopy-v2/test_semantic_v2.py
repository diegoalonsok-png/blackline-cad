import unittest
import cv2
import numpy as np
from semantic_v2 import evidence, fuse


def w(v,c,lo,hi,t):return dict(v=v,c=c,lo=lo,hi=hi,t=t)

class SemanticTests(unittest.TestCase):
    def setUp(self):
        self.ink=np.zeros((300,300),np.uint8)
        self.ink[40:60,20:260]=1
        self.base=w(False,49.5,20,259,20)
        self.ink[60:220,95:105]=1
        self.branch=w(True,99.5,60,219,10)

    def test_solid(self):self.assertEqual(evidence(self.ink,self.base),'solid')
    def test_mixed_width(self):
        a=fuse(self.ink,[self.base],[self.branch]);self.assertEqual([x['t'] for x in a],[20,10])
    def test_duplicate(self):self.assertEqual(len(fuse(self.ink,[self.base],[dict(self.base)])),1)
    def test_isolated(self):
        self.ink[250:260,20:140]=1
        self.assertEqual(len(fuse(self.ink,[self.base],[w(False,254.5,20,139,10)])),1)
    def test_single_stroke(self):
        self.ink[60:220,180]=1
        self.assertEqual(len(fuse(self.ink,[self.base],[w(True,180,60,219,14)])),1)
    def test_outline(self):
        self.ink[60:220,150]=self.ink[60:220,164]=1
        self.assertEqual(evidence(self.ink,w(True,157,60,219,15)),'outline')
    def test_hatch(self):
        self.ink[60:220,150]=self.ink[60:220,164]=1
        for y in range(64,204,8):cv2.line(self.ink,(150,y),(164,y+14),1,1)
        self.assertEqual(evidence(self.ink,w(True,157,60,219,15)),'hatched')
    def test_chain(self):
        self.ink[210:220,100:240]=1
        a=fuse(self.ink,[self.base],[w(False,214.5,100,239,10),self.branch]);self.assertEqual(len(a),3)
    def test_open_gap(self):
        self.ink[40:60,260:270]=0
        self.assertEqual(fuse(self.ink,[self.base],[]),[self.base])

if __name__=='__main__':unittest.main()
