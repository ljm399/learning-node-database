const connection = require("../../app/database");

class OppoService {
  async getHomeInfo() {    
    const statement = `
      SELECT JSON_OBJECT(
        'navbars', (
          SELECT COALESCE(
            JSON_ARRAYAGG(t.j),
            JSON_ARRAY()
          )
          FROM (
            SELECT JSON_OBJECT(
              'id', id,
              'title', title,
              'type', type,
              'link', link,
              'seq', seq
            ) AS j
            FROM oppo_navbar
            ORDER BY seq
          ) t
        ),
        'banners', (
          SELECT COALESCE(
            JSON_ARRAYAGG(t.j),
            JSON_ARRAY()
          )
          FROM (
            SELECT JSON_OBJECT(
              'id', id,
              'picStr', pic_str,
              'link', link,
              'seq', seq
            ) AS j
            FROM oppo_banner
            ORDER BY seq
          ) t
        ),
        'categorys', (
          SELECT COALESCE(
            JSON_ARRAYAGG(t.j),
            JSON_ARRAY()
          )
          FROM (
            SELECT JSON_OBJECT(
              'id', id,
              'picStr', pic_str,
              'firstItemPicStr', firstItemPicStr,
              'url', url,
              'title', title,
              'titleForGrid', titleForGrid,
              'type', type,
              'productDetailss', (
                SELECT COALESCE(
                  JSON_ARRAYAGG(pd.j),
                  JSON_ARRAY()
                )
                FROM (
                  SELECT JSON_OBJECT(
                    'id', p.id,
                    'title', p.title,
                    'url', p.url,
                    'priceInfo', (
                      SELECT JSON_OBJECT(
                        'prefix', pi.prefix,
                        'buyPrice', pi.buy_price,
                        'currencyTag', pi.currency_tag
                      )
                      FROM oppo_priceInfo pi
                      WHERE pi.product_detail_id = p.id
                      LIMIT 1
                    ),
                    'activityList', (
                      SELECT COALESCE(
                        JSON_ARRAYAGG(pa.j),
                        JSON_ARRAY()
                      )
                      FROM (
                        SELECT JSON_OBJECT(
                          'activityInfo', a.activity_info
                        ) AS j
                        FROM oppo_product_activity a
                        WHERE a.product_detail_id = p.id
                        ORDER BY a.seq
                      ) pa
                    )
                  ) AS j
                  FROM oppo_productDetail p
                  WHERE p.category_id = oppo_category.id
                  ORDER BY p.seq
                ) pd
              ),
              'seq', seq
            ) AS j
            FROM oppo_category
            ORDER BY seq
          ) t
        )
      ) AS data;
    `;
    
    const [rows] = await connection.query(statement);
    if (!rows.length) return { navbars: [], banners: [], categorys: [] };

    const data = rows[0].data;
    if (data && typeof data === "string") {
      return JSON.parse(data);
    }
    return data;
  }
}

module.exports = new OppoService();
