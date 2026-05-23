// clapp-data.jsx
// Single source of truth for CLApp sample data — accepts the canonical seed.json
// shape (nested households + members) and exposes derived flat views.
//
// Real build: this file is replaced by a runtime loader that reads the user's
// imported seed.json (or live SQLite data). For the prototype, the seed payload
// is inlined here so screens stay self-contained.
//
// Load BEFORE any page-specific Babel script.

(function() {
  // ─── Seed payload (canonical shape — matches seed.json from import wizard) ──
  const SEED = {
    "version": "1.0.0",
    "kelompok": { "name": "Cilandak A", "region": "SLM" },
    "households": [
      { "household_no":"001", "type":"KK",   "address":"Jl. Cilandak KKO No. 42, RT 003/RW 005", "members":[
        { "full_name":"Ahmad Faisal Rahman",  "nickname":"Pak Faisal",  "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"1978-03-12", "is_head":true,  "is_active":true, "role":"Imam" },
        { "full_name":"Siti Aminah Putri",    "nickname":"Bu Siti",     "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Bandung",    "birth_date":"1982-07-22", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Muhammad Yusuf",       "nickname":"Yusuf",       "gender":"Laki-Laki", "life_stage":"Muda-mudi",  "marital_status":"Belum Menikah", "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2003-11-18", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Fatimah Zahra",        "nickname":"Fatimah",     "gender":"Perempuan", "life_stage":"Remaja",     "marital_status":"Belum Menikah", "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2010-04-05", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Hasan Ali",            "nickname":null,          "gender":"Laki-Laki", "life_stage":"Cabe Rawit", "marital_status":"Belum Menikah", "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2016-09-30", "is_head":false, "is_active":true, "role":null }
      ]},
      { "household_no":"002", "type":"KK",   "address":"Jl. Cilandak Tengah Raya No. 18, RT 002/RW 004", "members":[
        { "full_name":"Bambang Hartono",      "nickname":"Pak Bambang", "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Solo",       "birth_date":"1975-06-04", "is_head":true,  "is_active":true, "role":"Sekretaris" },
        { "full_name":"Rahmah Wati",          "nickname":"Bu Rahmah",   "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"AB", "rhesus":"Positif",    "birth_place":"Yogyakarta", "birth_date":"1980-02-11", "is_head":false, "is_active":true, "role":"Bendahara" },
        { "full_name":"Bayu Pratama",         "nickname":"Bayu",        "gender":"Laki-Laki", "life_stage":"Muda-mudi",  "marital_status":"Menikah",       "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2001-08-25", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Salma Aulia",          "nickname":null,          "gender":"Perempuan", "life_stage":"Cabe Rawit", "marital_status":"Belum Menikah", "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2015-12-14", "is_head":false, "is_active":true, "role":null }
      ]},
      { "household_no":"003", "type":"KK-S", "address":"Jl. Margasatwa Raya No. 7, RT 001/RW 003", "members":[
        { "full_name":"Hj. Khadijah Salim",   "nickname":"Hj. Khadijah","gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Janda",         "blood_type":"O",  "rhesus":"Tidak Tahu", "birth_place":"Surabaya",   "birth_date":"1958-05-09", "is_head":true,  "is_active":true, "role":"Muballigh" }
      ]},
      { "household_no":"004", "type":"KK",   "address":"Jl. Cilandak KKO Gg. Mawar No. 12, RT 004/RW 005", "members":[
        { "full_name":"Abdul Rahman Hidayat", "nickname":"Pak Abdul",   "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"1973-01-17", "is_head":true,  "is_active":true, "role":"Wakil" },
        { "full_name":"Nurul Hidayah",        "nickname":"Bu Nurul",    "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Bogor",      "birth_date":"1977-10-28", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Rizki Ramadhan",       "nickname":"Rizki",       "gender":"Laki-Laki", "life_stage":"Muda-mudi",  "marital_status":"Belum Menikah", "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2000-09-02", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Anisa Aulia",          "nickname":"Anisa",       "gender":"Perempuan", "life_stage":"Remaja",     "marital_status":"Belum Menikah", "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2009-03-19", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Hafiz Maulana",        "nickname":null,          "gender":"Laki-Laki", "life_stage":"Cabe Rawit", "marital_status":"Belum Menikah", "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2014-06-07", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Najwa Putri",          "nickname":null,          "gender":"Perempuan", "life_stage":"Balita",     "marital_status":"Belum Menikah", "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2022-11-23", "is_head":false, "is_active":true, "role":null }
      ]},
      { "household_no":"005", "type":"KK",   "address":"Jl. Cilandak Tengah III No. 8, RT 002/RW 006", "members":[
        { "full_name":"Sutrisno Wijaya",      "nickname":"Pak Sutrisno","gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Semarang",   "birth_date":"1979-04-15", "is_head":true,  "is_active":true, "role":"KMM" },
        { "full_name":"Lestari Indah",        "nickname":"Bu Lestari",  "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"1984-01-03", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Putri Salwa",          "nickname":null,          "gender":"Perempuan", "life_stage":"Balita",     "marital_status":"Belum Menikah", "blood_type":"Tidak Tahu","rhesus":"Tidak Tahu","birth_place":"Jakarta",   "birth_date":"2023-07-26", "is_head":false, "is_active":true, "role":null }
      ]},
      { "household_no":"006", "type":"KK",   "address":"Jl. Pondok Labu Permai Blok C-7, RT 001/RW 007", "members":[
        { "full_name":"Eko Setiawan",         "nickname":"Pak Eko",     "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Solo",       "birth_date":"1976-12-09", "is_head":true,  "is_active":true, "role":"Aghnia" },
        { "full_name":"Dewi Sari",            "nickname":"Bu Dewi",     "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Solo",       "birth_date":"1981-05-21", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Aulia Rahmah",         "nickname":"Aulia",       "gender":"Perempuan", "life_stage":"Remaja",     "marital_status":"Belum Menikah", "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2011-02-13", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Reza Firmansyah",      "nickname":null,          "gender":"Laki-Laki", "life_stage":"Cabe Rawit", "marital_status":"Belum Menikah", "blood_type":"AB", "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2015-08-04", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Hadi Setiawan",        "nickname":null,          "gender":"Laki-Laki", "life_stage":"Muda-mudi",  "marital_status":"Belum Menikah", "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Solo",       "birth_date":"2002-06-16", "is_head":false, "is_active":false, "role":null }
      ]},
      { "household_no":"007", "type":"KK-S", "address":"Jl. Fatmawati Raya No. 130, RT 005/RW 002", "members":[
        { "full_name":"H. Mansur Hakim",      "nickname":"H. Mansur",   "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Duda",          "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Medan",      "birth_date":"1962-08-27", "is_head":true,  "is_active":true, "role":"Penerobos" }
      ]},
      { "household_no":"008", "type":"KK",   "address":"Jl. Cilandak Barat No. 25, RT 003/RW 008", "members":[
        { "full_name":"Imam Maulana",         "nickname":"Pak Imam",    "gender":"Laki-Laki", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Yogyakarta", "birth_date":"1974-03-30", "is_head":true,  "is_active":true, "role":"KU" },
        { "full_name":"Hidayah Sakinah",      "nickname":"Bu Hidayah",  "gender":"Perempuan", "life_stage":"Dewasa",     "marital_status":"Menikah",       "blood_type":"B",  "rhesus":"Negatif",    "birth_place":"Yogyakarta", "birth_date":"1978-09-12", "is_head":false, "is_active":true, "role":"PJP" },
        { "full_name":"Iqbal Rifqi",          "nickname":"Iqbal",       "gender":"Laki-Laki", "life_stage":"Muda-mudi",  "marital_status":"Belum Menikah", "blood_type":"O",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2002-04-08", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Nabila Safira",        "nickname":"Nabila",      "gender":"Perempuan", "life_stage":"Remaja",     "marital_status":"Belum Menikah", "blood_type":"B",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2010-01-25", "is_head":false, "is_active":true, "role":null },
        { "full_name":"Hamzah Ridwan",        "nickname":null,          "gender":"Laki-Laki", "life_stage":"Cabe Rawit", "marital_status":"Belum Menikah", "blood_type":"A",  "rhesus":"Positif",    "birth_place":"Jakarta",    "birth_date":"2014-11-17", "is_head":false, "is_active":true, "role":null }
      ]}
    ]
  };

  // ─── Loader: flatten the nested seed into the views screens expect ─────────
  // - window.CLAPP_SEED:           full nested payload (the canonical shape)
  // - window.CLAPP_HOUSEHOLDS_META: [{ no, type, alamat }, ...] (without members)
  // - window.CLAPP_ROSTER:         flat array of members with derived legacy fields
  //                                (mid 001-N, kkNo, name, gender L/P, kelas, nikah, etc.)
  //                                — preserves the field shape existing screens use.
  // - window.memberByMid(mid):     lookup
  function loadSeed(seed) {
    const META = seed.households.map(h => ({
      no: h.household_no, type: h.type, alamat: h.address,
    }));

    let counter = 1;
    const ROSTER = [];
    for (const h of seed.households) {
      for (const m of h.members) {
        const mid = String(counter++).padStart(3, "0");
        ROSTER.push({
          mid,
          name: m.full_name,
          panggilan: m.nickname || "",
          gender: m.gender === "Laki-Laki" ? "L" : "P",
          kkNo: h.household_no,
          head: !!m.is_head,
          active: m.is_active !== false,
          kelas: m.life_stage,
          nikah: m.marital_status,
          darah: m.blood_type,
          rhesus: m.rhesus,
          lahirT: m.birth_place || "",
          lahirD: m.birth_date
            ? (() => { const [y,mo,d] = m.birth_date.split("-"); return `${d}/${mo}/${y}`; })()
            : "",
          dapukan: m.role || null,
        });
      }
    }
    return { META, ROSTER };
  }

  const { META, ROSTER } = loadSeed(SEED);

  // Derived: Demografi grid for Laporan Bulanan
  const KELAS_ORDER = ["Balita","AUD","Cabe Rawit","Pra Remaja","Remaja","Muda-mudi","Dewasa"];
  function computeDemografi() {
    const tahap = KELAS_ORDER.map(name => ({ name, L:0, P:0 }));
    let janda = 0, duda = 0;
    for (const m of ROSTER) {
      const row = tahap.find(t => t.name === m.kelas);
      if (row) row[m.gender]++;
      if (m.nikah === "Janda") janda++;
      if (m.nikah === "Duda")  duda++;
    }
    return { tahap, janda, duda };
  }

  // ─── Sample event log (stays inline — events accumulate after go-live) ─────
  const EVENTS = [
    { tgl:"2026-05-03", jenis:"Lahir",             nama:"(bayi) Aisyah",     gender:"P", catatan:"anak dari Pak Faisal · kelas: Balita" },
    { tgl:"2026-05-05", jenis:"Perubahan Kelas",   nama:"Muhammad Yusuf",    gender:"L", catatan:"Remaja → Muda-mudi" },
    { tgl:"2026-05-07", jenis:"Sambung Baru",      nama:"Andi Hermawan",     gender:"L", catatan:"dari Bandung" },
    { tgl:"2026-05-09", jenis:"Menikah",           nama:"Bayu Pratama",      gender:"L", catatan:"Belum Menikah → Menikah" },
    { tgl:"2026-05-11", jenis:"Meninggal",         nama:"H. Sukiyat",        gender:"L", catatan:"" },
    { tgl:"2026-05-13", jenis:"Perubahan Dapukan", nama:"Rahmah Wati",       gender:"P", catatan:"— → Bendahara" },
    { tgl:"2026-05-15", jenis:"Sambung Baru",      nama:"Ibu Sumiati",       gender:"P", catatan:"dari Yogya, gabung dgn keluarga Pak Eko" },
    { tgl:"2026-05-18", jenis:"Sambung Baru",      nama:"Budi Santoso",      gender:"L", catatan:"dari Solo" },
    { tgl:"2026-05-20", jenis:"Pindah Sambung",    nama:"Andi Pratama",      gender:"L", catatan:"ke Surabaya (mutasi kerja)" },
    { tgl:"2026-05-22", jenis:"Pindah Sambung",    nama:"Rina W.",           gender:"P", catatan:"ke Jogja" },
  ];

  // Expose globals
  window.CLAPP_SEED            = SEED;
  window.CLAPP_KELOMPOK        = SEED.kelompok;
  window.CLAPP_HOUSEHOLDS_META = META;
  window.CLAPP_ROSTER          = ROSTER;
  window.CLAPP_EVENTS          = EVENTS;
  window.CLAPP_DEMOGRAFI       = computeDemografi();
  window.memberByMid           = (mid) => ROSTER.find(m => m.mid === mid);
})();
