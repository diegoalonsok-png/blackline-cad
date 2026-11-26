import unittest
import numpy as np
import cv2
from semantic_v2 import enclosed_regions,classify_region,region_hierarchy,residual_summary

class RoomTopology(unittest.TestCase):
    def setUp(self):
        self.m=np.zeros((700,800),np.uint8)
        cv2.rectangle(self.m,(50,50),(650,550),1,10)
    def test_rectangular_room(self):
        r=enclosed_regions(self.m)
        self.assertEqual(len(r),1)
        self.assertEqual(classify_region(r[0],100),'room_candidate')
    def test_open_room_not_invented(self):
        self.m[40:65,200:300]=0
        self.assertEqual(enclosed_regions(self.m),[])
    def test_pipe_shaft(self):
        # 50 x 30 cm internal void, attached to principal masonry.
        cv2.rectangle(self.m,(55,55),(115,95),1,10)
        r=enclosed_regions(self.m)
        self.assertIn('technical_void_candidate',[classify_region(q,100) for q in r])
    def test_unscaled(self):
        self.assertEqual(classify_region(enclosed_regions(self.m)[0],0),'unscaled')
    def test_nested_bathroom_envelope(self):
        cv2.rectangle(self.m,(440,55),(645,245),1,10)
        r=region_hierarchy(enclosed_regions(self.m))
        self.assertEqual(len(r),2)
        self.assertEqual(r[1]['possible_parent'],r[0]['id'])
        self.assertEqual(classify_region(r[1],100),'room_candidate')
    def test_detached_object(self):
        cv2.rectangle(self.m,(700,100),(760,140),1,4)
        r=enclosed_regions(self.m)
        self.assertIn('isolated_object_candidate',[classify_region(q,100) for q in r])
    def test_residual_retained(self):
        ink=self.m.copy();ink[600,100:200]=1
        self.assertEqual(residual_summary(ink,self.m)['unclassified_ink_px'],100)

if __name__=='__main__':unittest.main()
