import unittest
import numpy as np
from semantic_v2 import black_mask,validate_mask

def wall(v,c,lo,hi,t):
    return dict(v=v,c=c,lo=lo,hi=hi,t=t)

class MaskReview(unittest.TestCase):
    def setUp(self):
        self.ink=np.zeros((200,300),np.uint8)
    def test_black_rectangle(self):
        q=wall(False,50,20,80,10)
        m=black_mask(self.ink.shape,[q])
        self.assertEqual(m.sum(),61*11)
        self.assertEqual(m[50,19],0)
    def test_supported_solid(self):
        q=wall(False,50,20,180,10)
        self.ink[45:56,20:181]=1
        out,s=validate_mask(self.ink,[q])
        self.assertEqual(out,[q]);self.assertEqual(s['source_support_pct'],100)
    def test_preserve_gap(self):
        q=wall(False,50,20,240,10)
        self.ink[45:56,20:100]=1;self.ink[45:56,150:241]=1
        out,s=validate_mask(self.ink,[q])
        self.assertEqual(len(out),2);self.assertEqual(s['split'],1)
        self.assertFalse(black_mask(self.ink.shape,out)[50,125])
    def test_outline(self):
        q=wall(False,50,20,180,10)
        self.ink[45,20:181]=1;self.ink[55,20:181]=1
        out,s=validate_mask(self.ink,[q])
        self.assertEqual(out,[q])
    def test_reject_empty(self):
        out,s=validate_mask(self.ink,[wall(False,50,20,180,10)])
        self.assertEqual(out,[]);self.assertEqual(s['removed'],1)
    def test_trim(self):
        q=wall(False,50,20,180,10)
        self.ink[45:56,20:130]=1
        out,s=validate_mask(self.ink,[q])
        self.assertEqual(out[0]['hi'],129);self.assertEqual(s['trimmed'],1)
    def test_junction(self):
        q=wall(False,50,20,180,10);o=wall(True,100,50,150,18)
        self.ink[45,20:181]=1;self.ink[55,20:181]=1
        self.ink[45:56,91:110]=0;self.ink[50:151,91:110]=1
        out,s=validate_mask(self.ink,[q,o])
        self.assertEqual(len(out),2);self.assertEqual(s['split'],0)

if __name__=='__main__':unittest.main()
