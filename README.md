# flowbone — Trình biên tập hoạt hình xương 2D kiểu Spine

**flowbone** là một trình biên tập hoạt hình xương (skeletal animation).

Mục đích chính của nó: đọc thư mục xuất khẩu của **Spine 3.8**, biến chúng
thành dự án có thể chỉnh sửa, rồi ghi trở lại **đúng định dạng cũ** — để Unity
(runtime `spine-unity`) có thể chạy kết quả ngay lập tức, **không cần bước
chuyển đổi nào**.


---

## 1. Tính năng chính

### Nhập (Import)
- Trỏ vào một thư mục (ví dụ `Assets/Source_Animations`) và nó tự quét toàn bộ
  cây thư mục để tìm skeleton Spine: mọi file `*.json` hợp lệ, đi kèm
  `*.atlas.txt` và các trang `*.png`.
- Đọc cả tỉ lệ import từ `*_SkeletonData.asset` do Unity sinh ra, để bản xem
  trước khớp với cảnh thật.

### Chỉnh sửa (Edit)
- **Chế độ Setup**: chỉnh tư thế nghỉ — hệ phân cấp xương (thêm/đổi tên/gán
  cha/xóa), biến đổi xương, slot và thứ tự vẽ, màu slot, blend mode, region
  attachment và biến đổi cục bộ.
- **Chế độ Animate**: chỉnh keyframe của animation đang chọn. Kéo xương trên
  viewport hoặc gõ số vào ô thuộc tính sẽ ghi key tại vị trí playhead.
- Dope sheet có nút key/unkey theo từng kênh, key toàn bộ tư thế, xóa key và
  nội suy (tuyến tính / stepped / các preset ease).
- Animation có thể tạo, đổi tên, nhân bản và xóa.
- **Mesh**: dựng lưới theo 3 cách — lưới `n×m` đơn giản, **auto-trace** theo
  vùng pixel đục của artwork, hoặc **vẽ phác đường viền tay** ngay trên
  viewport. Cả ba đều tam giác hóa bằng Delaunay và cắt theo đường viền nên
  hình lõm vẫn giữ nguyên dạng lõm.
- Công cụ Mesh có 3 chế độ: *Vertices* (kéo/thêm/xóa đỉnh), *Outline* (đặt vỏ
  bao), *Faces* (bấm 3 đỉnh tạo tam giác, bấm mặt để xóa) + nút Retriangulate.
- **Bind weights**: tự động gán trọng số theo khoảng cách, chỉnh từng đỉnh,
  bản đồ nhiệt tô màu đỉnh theo ảnh hưởng của một xương.
- **Constraints**: liệt kê và chỉnh IK / transform / path. IK mix, softness,
  bend direction, compress, stretch có thể key ở chế độ animate.
- **Onion skin** (da hành): hiện tư thế ở các frame lân cận, frame trước tông
  lạnh, frame sau tông ấm.
- **Skins**: chuyển, tạo, đổi tên, xóa; tự chọn skin ít slot trống nhất khi mở
  các skeleton biến thể. Hỗ trợ **Compose a skin** để ghép da từ nhiều nguồn.
- **Undo/redo** cho mọi thao tác (⌘Z / ⇧⌘Z).

### Xuất (Export)
- Ghi `<name>.json` (hoặc `<name>.skel.bytes`), `<name>.atlas.txt` và các trang
  PNG vào thư mục bạn chọn. Bỏ vào cây `Assets/` của Unity là `spine-unity` tự
  sinh SkeletonData asset, atlas asset và material khi import.
- **New from images**: đóng gói các PNG rời thành một atlas (cắt viền trong
  suốt và ghi `offset`/`orig` packer) rồi tạo xương, slot và
  region attachment cho từng ảnh.

---

## 2. Định dạng hỗ trợ

| Định dạng | Đọc | Ghi |
|---|---|---|
| Spine JSON | ✅ | ✅ |
| FlowBone project (`.flowbone`) |


### Độ trung thực định dạng
Mô hình round-trip **đúng từng trường** của Spine JSON, kể cả các giá trị
mặc định thưa mà Spine editor phát sinh.

Hỗ trợ: bones (đủ 5 transform mode), slots, IK/transform/path constraint,
skins, region/mesh/linked-mesh/bounding-box/path/point/clipping attachment,
events, và mọi loại timeline animation (rotate, translate, scale, shear,
colour, two-colour, attachment, deform, draw order, events, IK, transform,
path).

---


## 3. Giao diện
:

```
┌──────────────────────────────────────────────────────────────────────┐
│ back · name · preview · skins            undo/redo · save/export     │
├──────────────────────────────────────────┬───────────────────────────┤
│ [Setup|Animate]                          │           Tree            │
│                                          │  skeleton                 │
│               viewport                   │   └ bone                  │
│           (chequerboard, origin          │      └ slot               │
│            crosshair)                    │         └ attachment      │
│                                          │  Constraints · Draw order │
│ root ▸ BODY ▸ HEAD ▸ slot ▸ attachment   │  Skins · Events · Anims   │
├──────────────────────────────────────────┼───────────────────────────┤
│ ┌Pose ┐┌Rotate    0    ○┐┌Mesh┐┌Bones ┐ │        Constraints        │
│ │Weigh││Translate 0  0 ○││    ││Images│ ├───────────────────────────┤
│ └Creat┘└Scale     1  1 ○┘└────┘└Meshes┘ │        Properties         │
├──────────────────────────────────────────┴───────────────────────────┤
│ Dopesheet │ Graph      playback · ghosting · keys · curves            │
└──────────────────────────────────────────────────────────────────────┘
```

- **Tree** lồng nhau: skeleton ở gốc, xương theo quan hệ cha-con, slot
  nằm dưới xương, attachment dưới slot; rồi các thư mục anh em Constraints,
  Draw order, Skins, Events, Animations, Images, Audio.
- **Toolbar** nằm dọc đáy viewport, mỗi công cụ có ô nhập số inline và nút key
  theo kênh.
- **Dope sheet** để nhãn và track trên một hàng để cuộn cùng nhau; kéo gần key
  chỉ di chuyển key đó, chuột phải xóa, kéo chỗ khác để scrub.
- **Graph** ngồi cạnh dope sheet để chỉnh đường cong trực tiếp.
- **Ghosting** vẽ tư thế ở các frame lân cận.
- **Preview** phát hàng đợi animation với crossfade như `AnimationState`.
- **Selection độc quyền**: mỗi lần chọn một thứ (xương, slot, attachment hay
  constraint).

---

## 4. Cấu trúc


Một dự án có thể lưu thành **một file `.flowbone`** duy nhất, hoặc nằm dưới dạng thư mục export Spine.
---

