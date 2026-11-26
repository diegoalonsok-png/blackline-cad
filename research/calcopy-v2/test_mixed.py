"""Run: python -m unittest discover -s research/calcopy-v2 -p 'test_mixed.py'"""
import json
import unittest
from unittest.mock import patch
import numpy as np
from bridge_v2 import _mixed, _recover_returns, _rectangular_junctions, analyze_v2

def wall(lo, hi, c=20, t=10, v=False):
    return dict(lo=lo, hi=hi, c=c, t=t, v=v)

class MixedTests(unittest.TestCase):
    def test_duplicate_is_not_inserted(self):
        self.assertEqual(_mixed([wall(10,100)], [wall(11,99,c=21)]), [wall(10,100)])
    def test_preserve_opening_gap(self):
        self.assertEqual(_mixed([wall(10,60)], [wall(100,150)]), [wall(10,60),wall(100,150)])
    def test_distinct_thickness_and_axis(self):
        self.assertEqual(len(_mixed([wall(10,100)], [wall(10,100,c=50,t=15)])),2)
    def test_perpendicular_wall_survives(self):
        self.assertEqual(len(_mixed([wall(10,100)], [wall(20,90,v=True)])),2)
    def test_partial_overlap_only_new_tail(self):
        self.assertEqual(_mixed([wall(10,100)], [wall(50,160)]),[wall(10,100),wall(100,160)])
    def test_no_mislabeled_fallback(self):
        pixels=np.full((100,100,4),255,np.uint8).tobytes()
        with patch('bridge_v2.W.detect', return_value=([wall(10,90)],10,'lines',None)):
            result=json.loads(analyze_v2(pixels,100,100))
        self.assertEqual(result['readings']['solid'],[])
        self.assertEqual(result['best'],'lines')
        self.assertEqual(len(result['readings']['mixed']),1)
    def test_residual_requires_wall_contact(self):
        im=np.full((100,100,3),255,np.uint8)
        faces=[dict(c=20,lo=20,hi=65,t=1),dict(c=30,lo=20,hi=65,t=1)]
        ink=np.zeros((100,100),np.uint8)
        def fake(im,paper,v):
            return ([],ink) if v else (faces,ink)
        with patch('bridge_v2.W.thin_lines',side_effect=fake):
            self.assertEqual(_recover_returns(im,[wall(0,60,c=90,v=True)],10),[])
            found=_recover_returns(im,[wall(0,60,c=20,v=True)],10)
            self.assertEqual(len(found),1)
            self.assertEqual((found[0]['lo'],found[0]['hi']),(20,65))
    def test_residual_single_line_is_not_wall(self):
        im=np.full((100,100,3),255,np.uint8)
        with patch('bridge_v2.W.thin_lines',return_value=([dict(c=20,lo=20,hi=65,t=1)],np.zeros((100,100),np.uint8))):
            self.assertEqual(_recover_returns(im,[wall(0,60,c=20,v=True)],10),[])
    def test_l_contact_constant_width(self):
        a,b=wall(10,45,c=20,t=10),wall(25,90,c=50,t=10,v=True)
        result=_rectangular_junctions([a,b])
        self.assertEqual(result,[wall(10,50,c=20,t=10),wall(20,90,c=50,t=10,v=True)])
        self.assertEqual(a['hi'],45)
        self.assertEqual(b['lo'],25)
    def test_t_keeps_through_wall(self):
        a,b=wall(0,100,c=20,t=10),wall(25,90,c=50,t=12,v=True)
        self.assertEqual(_rectangular_junctions([a,b]),[a,wall(20,90,c=50,t=12,v=True)])
    def test_x_preserves_both_through_walls(self):
        a,b=wall(0,100,c=50),wall(0,100,c=50,v=True)
        self.assertEqual(_rectangular_junctions([a,b]),[a,b])
    def test_no_join_across_opening_or_room(self):
        a,b,c=wall(0,40),wall(80,120),wall(60,100,c=50,v=True)
        self.assertEqual(_rectangular_junctions([a,b,c]),[a,b,c])
    def test_blank_image(self):
        pixels=np.full((100,100,4),255,np.uint8).tobytes()
        result=json.loads(analyze_v2(pixels,100,100))
        self.assertTrue(all(not items for items in result['readings'].values()))

if __name__=='__main__':
    unittest.main()
