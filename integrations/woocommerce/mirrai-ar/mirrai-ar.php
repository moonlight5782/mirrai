<?php
/**
 * Plugin Name: MIRRAI AR for WooCommerce
 * Description: Adds the MIRRAI furniture AR button to WooCommerce product pages.
 * Version: 1.0.0
 * Author: MIRRAI
 */
if (!defined('ABSPATH')) exit;

function mirrai_register_settings() {
  register_setting('mirrai_ar', 'mirrai_shop_id', ['sanitize_callback' => 'sanitize_key']);
  register_setting('mirrai_ar', 'mirrai_runtime_url', ['sanitize_callback' => 'esc_url_raw', 'default' => 'https://mirrai-try-on.moonlight-5782.chatgpt.site']);
}
add_action('admin_init', 'mirrai_register_settings');

function mirrai_settings_menu() { add_options_page('MIRRAI AR', 'MIRRAI AR', 'manage_options', 'mirrai-ar', 'mirrai_settings_page'); }
add_action('admin_menu', 'mirrai_settings_menu');

function mirrai_settings_page() { ?>
  <div class="wrap"><h1>MIRRAI AR</h1><p>Введите идентификатор магазина из кабинета MIRRAI. Кнопка появится у товаров, для которых опубликована 3D-модель.</p><form method="post" action="options.php"><?php settings_fields('mirrai_ar'); ?><table class="form-table"><tr><th><label for="mirrai_shop_id">Shop ID</label></th><td><input class="regular-text" id="mirrai_shop_id" name="mirrai_shop_id" value="<?php echo esc_attr(get_option('mirrai_shop_id')); ?>" required></td></tr><tr><th><label for="mirrai_runtime_url">Runtime URL</label></th><td><input class="regular-text" type="url" id="mirrai_runtime_url" name="mirrai_runtime_url" value="<?php echo esc_attr(get_option('mirrai_runtime_url', 'https://mirrai-try-on.moonlight-5782.chatgpt.site')); ?>" required></td></tr></table><?php submit_button('Сохранить и включить'); ?></form></div>
<?php }

function mirrai_product_slot() {
  global $product; $shop_id = get_option('mirrai_shop_id'); if (!$shop_id || !$product) return; $sku = $product->get_sku(); if (!$sku) return;
  echo '<div class="mirrai-ar-slot" data-mirrai-sku="' . esc_attr($sku) . '"></div>';
}
add_action('woocommerce_after_add_to_cart_form', 'mirrai_product_slot', 12);

function mirrai_enqueue_sdk() {
  if (!is_product() || !get_option('mirrai_shop_id')) return; $runtime = trailingslashit(get_option('mirrai_runtime_url', 'https://mirrai-try-on.moonlight-5782.chatgpt.site'));
  wp_enqueue_script('mirrai-ar', $runtime . 'mirrai-widget.js', [], '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'mirrai_enqueue_sdk');

function mirrai_script_attributes($tag, $handle) {
  if ($handle !== 'mirrai-ar') return $tag; return str_replace(' src=', ' data-shop-id="' . esc_attr(get_option('mirrai_shop_id')) . '" data-auto="scan" defer src=', $tag);
}
add_filter('script_loader_tag', 'mirrai_script_attributes', 10, 2);

function mirrai_variation_support() { if (!is_product()) return; ?>
  <script>jQuery(function($){$('form.variations_form').on('found_variation',function(_event,variation){var slot=document.querySelector('.mirrai-ar-slot');if(!slot||!variation.sku)return;slot.innerHTML='';slot.dataset.mirraiSku=variation.sku;slot.removeAttribute('data-mirrai-mounted');if(window.MirraiWidget)window.MirraiWidget.scan();});});</script>
<?php }
add_action('wp_footer', 'mirrai_variation_support', 30);
