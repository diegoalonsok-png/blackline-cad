import unittest
import cv2
import numpy as np
from semantic_v2 import repeated_floor_grid

class FloorGrid(unittest.TestCase):
    def setUp(self):
        self.ink=np.zeros((600,800),np.uint8)
        self.walls=np.zeros_like(self.ink)
    def test_rectangular_tiles(self):
        for x in range(100,501,50):cv2.line(self.ink,(x,100),(x,400),1,1)
        for y in range(100,401,50):cv2.line(self.ink,(100,y),(500,y),1,1)
        grids=repeated_floor_grid(self.ink,self.walls,100)
        self.assertTrue(grids)
        self.assertTrue(any(abs(g['tile_width_m']-.5)<.01 and abs(g['tile_depth_m']-.5)<.01 for g in grids))
    def test_parallel_stairs_not_grid(self):
        for y in range(100,401,25):cv2.line(self.ink,(100,y),(250,y),1,1)
        self.assertEqual(repeated_floor_grid(self.ink,self.walls,100),[])
    def test_no_scale(self):
        self.assertEqual(repeated_floor_grid(self.ink,self.walls,0),[])
    def test_known_walls_not_floor(self):
        for x in range(100,501,50):cv2.line(self.ink,(x,100),(x,400),1,12)
        for y in range(100,401,50):cv2.line(self.ink,(100,y),(500,y),1,12)
        self.assertEqual(repeated_floor_grid(self.ink,self.ink,100),[])
if __name__=='__main__':unittest.main()
