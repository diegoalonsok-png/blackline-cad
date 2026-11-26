"""Run: python -m unittest discover -s research/calcopy-v2 -p 'test_mixed.py'"""
import json
import unittest
from unittest.mock import patch
import numpy as np
from bridge_v2 import _mixed, analyze_v2

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
    def test_blank_image(self):
        pixels=np.full((100,100,4),255,np.uint8).tobytes()
        result=json.loads(analyze_v2(pixels,100,100))
        self.assertTrue(all(not items for items in result['readings'].values()))

if __name__=='__main__':
    unittest.main()
