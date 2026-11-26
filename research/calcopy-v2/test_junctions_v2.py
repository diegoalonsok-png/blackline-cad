"""Geometry regressions for CALCOPY v2. Run: python -m unittest test_junctions_v2."""
import unittest
from walls_v2 import merge, snap

def wall(v,c,lo,hi,t):
    return dict(v=v,c=c,lo=lo,hi=hi,t=t)

class JunctionTests(unittest.TestCase):
    def test_L_mixed_width(self):
        s=snap([wall(False,100,20,90,20),wall(True,100,100,200,15)],20)
        self.assertEqual((s[0]['hi'],s[1]['lo']),(100,100))
        self.assertEqual([q['t'] for q in s],[20,15])

    def test_T_mixed_width(self):
        s=snap([wall(False,100,20,200,20),wall(True,100,109,200,10)],20)
        self.assertEqual(s[1]['lo'],100)
        self.assertEqual((s[0]['lo'],s[0]['hi']),(20,200))

    def test_X_preserves_axes(self):
        x=[wall(False,100,20,200,20),wall(True,100,20,200,10)]
        self.assertEqual(snap(x,20),x)

    def test_opening_not_merged(self):
        self.assertEqual(len(merge([wall(False,100,0,80,20),wall(False,99,100,180,20)],20)),2)

    def test_distinct_widths_not_merged(self):
        self.assertEqual(len(merge([wall(False,100,0,80,20),wall(False,100,80,180,15)],20)),2)

    def test_reverse_order_extents(self):
        s=merge([wall(False,99,50,120,20),wall(False,100,20,80,20)],20)
        self.assertEqual(len(s),1)
        self.assertEqual((s[0]['lo'],s[0]['hi']),(20,120))

    def test_raster_adjacent(self):
        s=merge([wall(False,100,20,80,10),wall(False,100,81,200,10)],20)
        self.assertEqual(len(s),1)

    def test_free_end_not_extended_to_remote_axis(self):
        x=[wall(False,100,20,80,10),wall(True,100,20,200,10)]
        self.assertEqual(snap(x,20),x)

    def test_no_short_collapse(self):
        x=[wall(False,100,90,110,10),wall(True,100,0,200,20)]
        s=snap(x,20)
        self.assertGreaterEqual(s[0]['hi']-s[0]['lo'],10)

if __name__=='__main__':unittest.main()
