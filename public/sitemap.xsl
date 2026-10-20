<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="id">
      <head>
        <title>XML Sitemap · CMS SEO</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #2c3338;
            background: #f0f0f1;
            margin: 0;
            padding: 24px;
            font-size: 14px;
            line-height: 1.5;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            border: 1px border #c3c4c7;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          .header {
            background: #1d2327;
            color: #ffffff;
            padding: 24px 32px;
          }
          .header h1 {
            margin: 0 0 6px 0;
            font-size: 22px;
            font-weight: 700;
          }
          .header p {
            margin: 0;
            font-size: 13px;
            color: #c3c4c7;
            line-height: 1.6;
          }
          .stats {
            background: #f6f7f7;
            border-bottom: 1px solid #dcdcde;
            padding: 12px 32px;
            font-size: 13px;
            font-weight: 600;
            color: #50575e;
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background: #f6f7f7;
            text-align: left;
            padding: 12px 16px;
            font-weight: 600;
            color: #1d2327;
            border-bottom: 1px solid #c3c4c7;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f1;
            vertical-align: middle;
          }
          tr:hover td {
            background: #fbfbfb;
          }
          a {
            color: #2271b1;
            text-decoration: none;
            word-break: break-all;
          }
          a:hover {
            color: #135e96;
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            background: #e7f5ea;
            color: #007017;
          }
          .badge-freq {
            background: #f0f0f1;
            color: #50575e;
          }
          .footer {
            padding: 16px 32px;
            background: #f6f7f7;
            border-top: 1px solid #dcdcde;
            font-size: 12px;
            color: #646970;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>XML Sitemap</h1>
            <p>Peta situs XML untuk mesin pencari seperti Google dan Bing. Format ini dirancang khusus untuk memastikan semua halaman dan artikel terindeks secara optimal.</p>
          </div>
          <div class="stats">
            Jumlah URL terdaftar: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> tautan
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">URL Halaman</th>
                  <th style="width: 10%;">Prioritas</th>
                  <th style="width: 15%;">Frekuensi</th>
                  <th style="width: 20%;">Terakhir Diperbarui</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <xsl:if test="sitemap:priority">
                        <span class="badge">
                          <xsl:value-of select="sitemap:priority"/>
                        </span>
                      </xsl:if>
                    </td>
                    <td>
                      <xsl:if test="sitemap:changefreq">
                        <span class="badge badge-freq">
                          <xsl:value-of select="sitemap:changefreq"/>
                        </span>
                      </xsl:if>
                    </td>
                    <td style="color: #646970; font-size: 12px;">
                      <xsl:value-of select="substring(sitemap:lastmod, 0, 11)"/>
                      <xsl:text> </xsl:text>
                      <xsl:value-of select="substring(sitemap:lastmod, 12, 5)"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer">
            <span>CMS SEO WP-Lite · Standar Protokol Sitemaps 0.9</span>
            <a href="/" style="font-weight: 600;">← Kembali ke Beranda</a>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
