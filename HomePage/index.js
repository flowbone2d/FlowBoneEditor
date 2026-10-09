/* ---------------------------------------------------------------
   Hoạt ảnh FlowBone trên trang: một khung nhỏ trong avatar và một
   khung xem thử lớn ở cuối trang.

   File xuất ra của FlowBone là định dạng Spine 4.2 (json + atlas +
   png), nên ở đây dùng thẳng spine-player chính chủ để render. Pin
   cứng version 4.2.x: nhánh 4.3 đọc skeleton 4.2 không đảm bảo.

   Runtime nặng ~600KB + cần WebGL nên nạp một lần, dùng chung cho cả
   hai khung, và mỗi khung chỉ dựng khi sắp lọt vào khung nhìn. Nạp
   hỏng / máy không có WebGL thì giữ nguyên ảnh tĩnh fallback.
   --------------------------------------------------------------- */
(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-player@4.2.120/dist/';
  var ASSETS = 'SampleAnim/Cat%20Lite';

  /* Cấu hình chung cho mọi khung. Thân mèo nằm ở skin1..skin4; skin
     "default" chỉ có phụ kiện (viền tay, súng, kiếm, vùng clipping)
     và luôn được áp thêm — không chỉ định skin thì player lấy skin
     đầu danh sách là "default" và khung sẽ gần như trống. */
  var BASE = {
    jsonUrl: ASSETS + '.json',
    atlasUrl: ASSETS + '.atlas.txt',
    premultipliedAlpha: false,  /* atlas không có cờ pma */
    alpha: true,                /* để lọt nền của thẻ phía sau */
    backgroundColor: '#00000000',
    showControls: false
  };

  var loading = false;   /* đã bắt đầu nạp runtime chưa */
  var ready = false;     /* runtime đã sẵn sàng chưa */
  var failure = null;    /* lý do hỏng, nếu có */
  var queue = [];        /* khung đang chờ runtime */

  function loadCss(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadRuntime() {
    if (loading) return;
    loading = true;
    loadCss(CDN + 'spine-player.css');

    var s = document.createElement('script');
    s.src = CDN + 'iife/spine-player.js';
    s.async = true;
    s.onload = function () {
      if (!window.spine || !window.spine.SpinePlayer) {
        settle('Không nạp được thư viện hoạt ảnh.');
        return;
      }
      settle(null);
    };
    s.onerror = function () {
      settle('Không nạp được thư viện hoạt ảnh. Kiểm tra kết nối mạng rồi tải lại trang.');
    };
    document.head.appendChild(s);
  }

  function settle(err) {
    ready = !err;
    failure = err;
    queue.splice(0).forEach(build);
  }

  function build(stage) {
    if (failure) {
      stage.fail(failure);
      return;
    }
    try {
      new window.spine.SpinePlayer(stage.el, Object.assign({}, BASE, stage.config, {
        success: stage.ready || null,
        error: function (player, reason) {
          stage.fail('Không tải được hoạt ảnh mẫu. ' + (reason || ''));
        }
      }));
    } catch (e) {
      stage.fail('Thiết bị không hỗ trợ WebGL nên không chạy được hoạt ảnh.');
    }
  }

  /* Dựng khung khi nó sắp lọt vào khung nhìn. Khung avatar nằm ngay
     đầu trang nên thực tế chạy luôn; khung lớn ở cuối trang thì đợi
     người xem cuộn tới. */
  function whenVisible(el, run) {
    if (!('IntersectionObserver' in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { io.disconnect(); run(); }
      });
    }, { rootMargin: '200px' });
    io.observe(el);
  }

  function register(stage) {
    whenVisible(stage.el, function () {
      loadRuntime();
      if (ready || failure) build(stage); else queue.push(stage);
    });
  }

  /* ---- khung nhỏ trong avatar ---- */
  var avatar = document.getElementById('avatar-stage');
  if (avatar) {
    register({
      el: avatar,
      config: {
        animation: 'gun-idle',
        skin: 'skin3',
        interactive: false,   /* khỏi kéo được nhân vật ra khỏi khung tròn */
        showLoading: false,   /* vòng xoay chờ quá to so với khung này */
        /* Khung vuông ôm sát nhân vật, pad 0. Để player tự tính thì
           nó fit cả chiều ngang cây súng và con mèo bé xíu lại. */
        viewport: {
          x: -383, y: -40, width: 780, height: 780,
          padLeft: 0, padRight: 0, padTop: 0, padBottom: 0
        }
      },
      ready: function () {
        /* Ảnh tĩnh phía sau phải tắt, không thì lộ ra qua phần
           trong suốt của nhân vật. */
        avatar.parentNode.classList.add('is-live');
      },
      fail: function () { /* giữ nguyên ảnh đại diện tĩnh */ }
    });
  }

  /* ---- khung xem thử lớn ---- */
  var showcase = document.getElementById('anim-stage');
  if (showcase) {
    var fallback = document.getElementById('anim-fallback');
    var panel = document.getElementById('anim-panel');

    /* aria-pressed là nguồn trạng thái duy nhất, CSS tô màu theo nó. */
    var wireChips = function (player, selector, apply) {
      var chips = panel ? panel.querySelectorAll(selector) : [];
      Array.prototype.forEach.call(chips, function (chip) {
        chip.disabled = false;
        chip.addEventListener('click', function () {
          Array.prototype.forEach.call(chips, function (other) {
            other.setAttribute('aria-pressed', String(other === chip));
          });
          apply(player, chip);
        });
      });
    };

    register({
      el: showcase,
      config: {
        animation: 'normal-idle',
        animations: ['normal-idle', 'gun-idle', 'slash'],
        skin: 'skin1',
        skins: ['skin1', 'skin2', 'skin3', 'skin4'],
        showLoading: true,
        defaultMix: 0.18,
        viewport: { padLeft: '4%', padRight: '4%', padTop: '6%', padBottom: '4%' }
      },
      ready: function (player) {
        showcase.classList.add('is-live');
        wireChips(player, '[data-anim]', function (p, chip) {
          p.setAnimation(chip.dataset.anim, true);
          p.play();
        });
        wireChips(player, '[data-skin]', function (p, chip) {
          p.skeleton.setSkinByName(chip.dataset.skin);
          p.skeleton.setSlotsToSetupPose();
        });
      },
      fail: function (msg) {
        if (fallback) fallback.textContent = msg;
      }
    });
  }
})();
