const connection = require("../../app/database");

class RedwoodService {
  async getInfo() {
    const statement = `
      SELECT JSON_OBJECT(
        'id', rc.id,
        'defaultKey', rc.default_key,
        'configKey', (
          SELECT COALESCE(
            JSON_ARRAYAGG(t.j),
            JSON_ARRAY()
          )
          FROM (
            SELECT JSON_OBJECT(
              'id', rwt.id,
              'label', rwt.wood_name
            ) AS j
            FROM redwood_wood_type rwt
            WHERE rwt.config_id = rc.id
            ORDER BY rwt.seq
          ) t
        )
      ) AS data
      FROM redwood_config rc
      WHERE rc.is_active = 1
      ORDER BY rc.id DESC
      LIMIT 1;
    `;

    const [rows] = await connection.query(statement);
    if (!rows.length) return { id: null, defaultKey: "黄花梨", configKey: [] };

    const data = rows[0].data;
    if (data && typeof data === "string") {
      return JSON.parse(data);
    }
    return data;
  }

  async getBanners() {
    const statement = `
      SELECT
        rb.id id,
        UNIX_TIMESTAMP(rb.add_time) * 1000 addTime,
        UNIX_TIMESTAMP(rb.begin_time) * 1000 beginTime,
        rb.end_time endTime,
        rb.pic_str picStr,
        rb.backend_pic_str backendPicStr
      FROM redwood_banner rb
      ORDER BY rb.seq;
    `;

    const [result] = await connection.query(statement);
    return result;
  }

  async getCategories() {
    const statement = `
      SELECT
        rc.cid cid,
        rc.pic_str picStr,
        rc.title title,
        rc.tab_index tabIndex,
        rc.target_url targetUrl,
        rc.count count,
        rc.desc_text ${"`desc`"},
        rc.type type
      FROM redwood_category rc
      ORDER BY rc.tab_index;
    `;

    const [rows] = await connection.query(statement);
    return {
      categorys: rows,
    };
  }
}

module.exports = new RedwoodService();
