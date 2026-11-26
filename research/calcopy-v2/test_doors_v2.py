import unittest
import cv2
import numpy as np
from semantic_v2 import detect_door_symbols

class DoorSymbols(unittest.TestCase):
    def setUp(self):
        self.ink=np.zeros((400,500),np.uint8)
        self.walls=[dict(v=False,c=180,lo=40,hi=180,t=16),dict(v=False,c=180,lo=260,hi=440,t=16)]
    def swing(self,low,side):
        x=180 if low else 260
        direction=1 if low else -1
        t=np.linspace(0,np.pi/2,80)
        pts=np.rint(np.column_stack((x+direction*80*np.cos(t),180+side*80*np.sin(t)))).astype(np.int32)
        cv2.polylines(self.ink,[pts],False,1,1)
        cv2.line(self.ink,(x,180),(x,180+side*80),1,1)
        out=detect_door_symbols(self.ink,self.walls,100)
        self.assertEqual(len(out),1)
        self.assertEqual(out[0]['kind'],'swing-door')
        self.assertEqual(out[0]['hingeAtLo'],low)
        self.assertEqual(out[0]['side'],side)
    def test_left_in(self):self.swing(True,1)
    def test_right_out(self):self.swing(False,-1)
    def test_vertical(self):
        self.swing(True,-1)
        ws=[dict(q,v=True) for q in self.walls]
        a=detect_door_symbols(self.ink.T.copy(),ws,100)
        self.assertEqual(a[0]['kind'],'swing-door')
        self.assertTrue(a[0]['v'])
    def test_pocket(self):
        cv2.line(self.ink,(100,180),(260,180),1,1)
        cv2.line(self.ink,(40,172),(180,172),1,1)
        cv2.line(self.ink,(40,188),(180,188),1,1)
        a=detect_door_symbols(self.ink,self.walls,100)
        self.assertEqual(a[0]['kind'],'pocket-door-candidate')
        self.assertEqual(a[0]['pocket_side'],-1)
    def test_window_not_door(self):
        for y in (177,183):cv2.line(self.ink,(180,y),(260,y),1,1)
        self.assertEqual(detect_door_symbols(self.ink,self.walls,100),[])
    def test_empty_gap(self):self.assertEqual(detect_door_symbols(self.ink,self.walls,100),[])
if __name__=='__main__':unittest.main()
