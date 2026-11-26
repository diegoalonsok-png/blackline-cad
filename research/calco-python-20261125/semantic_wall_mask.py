"""Experimental semantic mask adapter. Requires actual model predictions.
No trained weights included; no automatic production integration.
CubiCasa5K room ID 2 = wall, icon ID 0 = empty (eval.py).
Columns require a separately trained class/mask. No arbitrary thickness.
"""
import numpy as np

def paint_structure(room_ids, icon_ids, column_mask=None):
    """Return black structure on white paper, using aligned pixel class maps.
    Exclude classified icons, including closets, doors and windows.
    The input must come from semantic inference or reviewed annotations.
    """
    rooms=np.asarray(room_ids)
    icons=np.asarray(icon_ids)
    if rooms.ndim!=2 or rooms.shape!=icons.shape:
        raise ValueError("Aligned two-dimensional class maps required")
    if not np.issubdtype(rooms.dtype,np.integer) or not np.issubdtype(icons.dtype,np.integer):
        raise ValueError("Expected integer class IDs, not logits")
    if np.any((rooms<0)|(rooms>11)) or np.any((icons<0)|(icons>10)):
        raise ValueError("Unexpected CubiCasa class IDs")
    structure=rooms==2
    if column_mask is not None:
        columns=np.asarray(column_mask)
        if columns.shape!=rooms.shape or columns.dtype!=np.bool_:
            raise ValueError("Aligned boolean column mask required")
        structure |= columns
    structure &= icons==0
    return np.where(structure,0,255).astype(np.uint8)

def self_test():
    rooms=np.zeros((100,120),dtype=np.int32)
    icons=np.zeros_like(rooms)
    rooms[10:90,10:20]=2
    rooms[10:90,90:115]=2
    rooms[30:35,20:90]=2
    rooms[50:60,20:50]=2
    icons[50:60,20:50]=3
    icons[10:20,10:20]=2
    columns=np.zeros_like(rooms,dtype=bool)
    columns[70:78,50:58]=True
    mask=paint_structure(rooms,icons,columns)
    assert np.all(mask[20:90,10:20]==0)
    assert np.all(mask[10:90,90:115]==0)
    assert np.all(mask[30:35,20:90]==0)
    assert np.all(mask[50:60,20:50]==255)
    assert np.all(mask[10:20,10:20]==255)
    assert np.all(mask[70:78,50:58]==0)
    assert mask[0,0]==255

if __name__=="__main__":
    self_test()
    print("Synthetic class-map contract passed (not model accuracy)")
