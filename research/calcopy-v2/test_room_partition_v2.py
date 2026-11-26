import unittest
import cv2
import numpy as np
from semantic_v2 import room_partition_mask,enclosed_regions

class VirtualRoomBoundary(unittest.TestCase):
    def test_confirmed_swing_separates_rooms_without_changing_wall(self):
        mask=np.zeros((240,340),np.uint8)
        cv2.rectangle(mask,(20,20),(320,220),1,9)
        cv2.line(mask,(170,20),(170,85),1,9)
        cv2.line(mask,(170,155),(170,220),1,9)
        old=mask.copy()
        door=dict(kind='swing-door',v=True,c=170,g0=85,g1=155)
        self.assertEqual(len(enclosed_regions(mask)),1)
        partition=room_partition_mask(mask,[door])
        self.assertEqual(len(enclosed_regions(partition)),2)
        np.testing.assert_array_equal(mask,old)
        self.assertEqual(mask[120,170],0)
    def test_uncertain_openings_not_sealed(self):
        mask=np.zeros((240,340),np.uint8)
        door=dict(kind='pocket-door-candidate',review=True,v=True,c=170,g0=85,g1=155)
        np.testing.assert_array_equal(room_partition_mask(mask,[door]),mask)
    def test_rejected_thin_partition_does_not_create_room(self):
        import json
        from unittest.mock import patch
        from bridge_v2 import analyze_v2
        def w(v,c,lo,hi,t):
            return dict(v=v,c=c,lo=lo,hi=hi,t=t)
        walls=[w(False,20,20,280,12),w(False,280,20,280,12),
               w(True,20,20,280,12),w(True,280,20,280,12),
               w(True,150,20,280,4)]
        image=np.full((300,300,4),255,np.uint8)
        with patch('bridge_v2.W.detect',return_value=([],0,None,None)), \
             patch('bridge_v2.W.line_pairs',return_value=([],0)), \
             patch('bridge_v2.S.validate_mask',return_value=(walls,{})):
            result=json.loads(analyze_v2(image.tobytes(),300,300,3.0))
        self.assertEqual(len(result['readings']['validated']),5)
        self.assertEqual(len(result['readings']['metric']),4)
        self.assertEqual(result['validation']['metric']['rejected_thin'],1)
        self.assertEqual(len(result['regions']),1)
        self.assertLess(result['validation']['metric_wall_mask_px'],
                        result['validation']['validated_wall_mask_px'])

if __name__=='__main__':unittest.main()
