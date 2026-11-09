export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-features">
        <div>HYPOALLERGENIC — No Allergies</div>
        <div>CASH ON DELIVERY — Shop with ease</div>
        <div>GIFT YOUR LOVED ONES — Find the perfect gift</div>
      </div>

      <div className="footer-links">
        <a href="/about">ABOUT</a>
        {/* Goes straight to WhatsApp chat rather than a contact page —
            per request. Number is +961 81 191 446; wa.me needs it
            without the "+" or any spaces. */}
        <a href="https://wa.me/96181191446" target="_blank" rel="noreferrer">
          CONTACT
        </a>
        <a href="/shipping">SHIPPING</a>
        <a href="/privacy">PRIVACY</a>
        {/* /shop lists every category (Necklaces, Bracelets, etc.) with
            its own "See All" link — there's no separate /categories page,
            so this points there instead of a dead link. */}
        <a href="/shop">CATEGORIES</a>
      </div>

      <div className="footer-bottom">
        <p>FOLLOW @VENUSBIJOUX.LB</p>
        <p>Highest Quality Accessories — Best Prices</p>
        <p>+961 81 191 446</p>
        <p>ENGLISH</p>
      </div>
    </footer>
  );
}
