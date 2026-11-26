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
if __name__=='__main__':unittest.main()
