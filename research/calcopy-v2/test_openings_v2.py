import unittest
import numpy as np
from semantic_v2 import black_mask, detect_openings

class PassageTests(unittest.TestCase):
    def test_50_controlled_opening_cases(self):
        # Five widths, both orientations, five symbol / context cases.
        # These are synthetic regression cases, not 50 independent real plans.
        for gap in (60,85,120,200,350):
            for vertical in (False,True):
                for mode in ('blank','glazing','door','outside','unscaled'):
                    with self.subTest(gap=gap,vertical=vertical,mode=mode):
                        lo,hi=400-gap/2,400+gap/2
                        walls=[
                            dict(v=False,c=100,lo=80,hi=720,t=20),
                            dict(v=False,c=500,lo=80,hi=720,t=20),
                            dict(v=True,c=80,lo=100,hi=500,t=20),
                            dict(v=True,c=720,lo=100,hi=500,t=20),
                            dict(v=False,c=300,lo=80,hi=lo,t=16),
                            dict(v=False,c=300,lo=hi,hi=720,t=16)]
                        if mode=='outside': walls=walls[1:]
                        ink=black_mask((600,800),walls)
                        if mode=='glazing': ink[297:299,int(lo)+1:int(hi)]=1
                        doors=[dict(v=False,c=300,g0=lo,g1=hi)] if mode=='door' else []
                        if vertical:
                            ink=ink.T.copy()
                            walls=[dict(q,v=not q['v']) for q in walls]
                            doors=[dict(q,v=True) for q in doors]
                        before=ink.copy()
                        result=detect_openings(ink,walls,0 if mode=='unscaled' else 100,doors)
                        np.testing.assert_array_equal(before,ink)
                        if mode=='unscaled':
                            self.assertEqual(result,[])
                            continue
                        self.assertEqual(len(result),1)
                        self.assertEqual(result[0]['kind'],{
                            'blank':'open-passage-candidate','glazing':'unknown-symbol',
                            'door':'door','outside':'unresolved-gap'}[mode])
                        self.assertTrue(result[0]['virtual_only'])

if __name__=='__main__':unittest.main()
