import nodemailer from "nodemailer";

// Lazy-create transporter so env variables are loaded
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return transporter;
};

/**
 * Send 6-digit verification OTP email
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} userName 
 */
export const sendOtpEmail = async (toEmail, otp, userName = "Valued Guest") => {
    try {
        const mailClient = getTransporter();

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your StayNest Account</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 40px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(16, 52, 37, 0.08); border: 1px solid #EAE5D9;">
                            
                            <!-- Brand Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #103425 0%, #164E39 100%); padding: 36px 40px; text-align: center;">
                                    <div style="display: inline-block;">
                                        <span style="font-size: 26px; font-weight: 800; color: #FAF8F5; letter-spacing: -0.5px;">
                                            Stay<span style="color: #D4AF6A;">Nest</span>
                                        </span>
                                    </div>
                                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #D4AF6A; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Luxury Living &bull; Handcrafted Stays</p>
                                </td>
                            </tr>

                            <!-- Body Content -->
                            <tr>
                                <td style="padding: 40px 40px 32px 40px;">
                                    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #103425; letter-spacing: -0.3px;">
                                        Verify your email address
                                    </h2>
                                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                                        Namaste <strong>${userName}</strong>,<br>
                                        Thank you for choosing StayNest. Please use the following 6-digit verification code to complete your account registration and secure your access:
                                    </p>

                                    <!-- OTP Code Box -->
                                    <div style="background: #F4F8F5; border: 1.8px dashed #D4AF6A; border-radius: 14px; padding: 22px; text-align: center; margin: 28px 0;">
                                        <span style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.5px; color: #164E39; font-weight: 700; display: block; margin-bottom: 8px;">Your One-Time Code</span>
                                        <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #103425; font-family: 'Courier New', Courier, monospace;">
                                            ${otp}
                                        </div>
                                        <span style="font-size: 12.5px; color: #6B7280; display: block; margin-top: 8px;">
                                            ⏱ Valid for <strong>10 minutes</strong> only
                                        </span>
                                    </div>

                                    <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6B7280;">
                                        If you did not request this verification code, please ignore this email or reach out to our security team immediately.
                                    </p>

                                    <div style="border-top: 1px solid #F0ECE1; padding-top: 20px; margin-top: 24px;">
                                        <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.4;">
                                            <strong>Security Notice:</strong> StayNest support representatives will never ask you for your password or OTP under any circumstance.
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #FAF8F5; padding: 24px 40px; text-align: center; border-top: 1px solid #EAE5D9;">
                                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #717171;">
                                        &copy; ${new Date().getFullYear()} StayNest, Inc. All rights reserved.
                                    </p>
                                    <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                                        Crafted with luxury & security for exceptional hosts and travellers worldwide.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"StayNest Security" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `StayNest Verification Code: ${otp}`,
            text: `Your StayNest verification code is: ${otp}. It is valid for 10 minutes. Please do not share this code with anyone.`,
            html: htmlContent,
        };

        const info = await mailClient.sendMail(mailOptions);
        console.log(`[EmailService] OTP sent to ${toEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("[EmailService] Error sending OTP email:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send booking confirmation email with detailed reservation summary
 * @param {string} toEmail 
 * @param {object} booking 
 * @param {string} userName 
 */
export const sendBookingConfirmationEmail = async (toEmail, booking, userName = "Valued Guest") => {
    try {
        const mailClient = getTransporter();

        const checkInDate = new Date(booking.checkIn).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        const checkOutDate = new Date(booking.checkOut).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        const formattedAmount = Number(booking.totalAmount).toLocaleString("en-IN");
        const bookingRef = String(booking._id).slice(-8).toUpperCase();

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your StayNest Reservation Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 36px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(16, 52, 37, 0.08); border: 1px solid #EAE5D9;">
                            
                            <!-- Brand Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #0B1C14 0%, #143528 100%); padding: 34px 40px; text-align: center;">
                                    <div style="display: inline-block;">
                                        <span style="font-size: 26px; font-weight: 800; color: #FAF8F5; letter-spacing: -0.5px;">
                                            Stay<span style="color: #D4AF6A;">Nest</span>
                                        </span>
                                    </div>
                                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #D4AF6A; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Verified Luxury Accommodation</p>
                                </td>
                            </tr>

                            <!-- Hero Confirmation Banner -->
                            <tr>
                                <td style="padding: 32px 40px 20px 40px; text-align: center; border-bottom: 1px solid #F0ECE1;">
                                    <div style="display: inline-block; background: #EBF7EE; color: #0E7044; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; border: 1px solid #C3E9CD;">
                                        &bull; Reservation Confirmed &bull;
                                    </div>
                                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #143528; letter-spacing: -0.4px;">
                                        You're all set, ${userName}!
                                    </h1>
                                    <p style="margin: 0; font-size: 14.5px; color: #6B7280;">
                                        Booking Reference: <strong style="color: #143528; font-family: monospace;">#STAY-${bookingRef}</strong>
                                    </p>
                                </td>
                            </tr>

                            <!-- Property Overview -->
                            <tr>
                                <td style="padding: 28px 40px 10px 40px;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FAF8F5; border: 1px solid #EAE5D9; border-radius: 14px; overflow: hidden;">
                                        ${booking.propertyPhoto ? `
                                        <tr>
                                            <td>
                                                <img src="${booking.propertyPhoto}" alt="${booking.propertyTitle}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
                                            </td>
                                        </tr>` : ''}
                                        <tr>
                                            <td style="padding: 18px 20px;">
                                                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #143528;">
                                                    ${booking.propertyTitle}
                                                </h3>
                                                <p style="margin: 0; font-size: 13.5px; color: #6B7770;">
                                                    📍 ${booking.propertyCity}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Reservation Details Grid -->
                            <tr>
                                <td style="padding: 20px 40px;">
                                    <h4 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #143528; text-transform: uppercase; letter-spacing: 0.05em;">
                                        Reservation Schedule
                                    </h4>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #EAE5D9; border-radius: 12px; overflow: hidden;">
                                        <tr>
                                            <td style="padding: 14px 18px; width: 50%; border-right: 1px solid #EAE5D9; border-bottom: 1px solid #EAE5D9; background: #FFFFFF;">
                                                <span style="font-size: 11px; text-transform: uppercase; color: #6B7770; font-weight: 700; display: block; margin-bottom: 4px;">Check-In</span>
                                                <strong style="font-size: 14.5px; color: #143528;">${checkInDate}</strong>
                                                <span style="font-size: 12px; color: #6B7770; display: block; margin-top: 2px;">After 3:00 PM</span>
                                            </td>
                                            <td style="padding: 14px 18px; width: 50%; border-bottom: 1px solid #EAE5D9; background: #FFFFFF;">
                                                <span style="font-size: 11px; text-transform: uppercase; color: #6B7770; font-weight: 700; display: block; margin-bottom: 4px;">Check-Out</span>
                                                <strong style="font-size: 14.5px; color: #143528;">${checkOutDate}</strong>
                                                <span style="font-size: 12px; color: #6B7770; display: block; margin-top: 2px;">Before 11:00 AM</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 14px 18px; width: 50%; border-right: 1px solid #EAE5D9; background: #FFFFFF;">
                                                <span style="font-size: 11px; text-transform: uppercase; color: #6B7770; font-weight: 700; display: block; margin-bottom: 4px;">Guests</span>
                                                <strong style="font-size: 14.5px; color: #143528;">${booking.guests} Guest${booking.guests > 1 ? 's' : ''}</strong>
                                            </td>
                                            <td style="padding: 14px 18px; width: 50%; background: #FFFFFF;">
                                                <span style="font-size: 11px; text-transform: uppercase; color: #6B7770; font-weight: 700; display: block; margin-bottom: 4px;">Length of Stay</span>
                                                <strong style="font-size: 14.5px; color: #143528;">${booking.totalNights} Night${booking.totalNights > 1 ? 's' : ''}</strong>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Price Breakdown Table -->
                            <tr>
                                <td style="padding: 0 40px 20px 40px;">
                                    <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #143528; text-transform: uppercase; letter-spacing: 0.05em;">
                                        Payment Summary
                                    </h4>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="font-size: 14px; color: #374151;">
                                        <tr>
                                            <td style="padding: 6px 0;">₹${Number(booking.pricePerNight).toLocaleString('en-IN')} &times; ${booking.totalNights} nights</td>
                                            <td align="right" style="padding: 6px 0; font-weight: 600;">₹${(Number(booking.pricePerNight) * Number(booking.totalNights)).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0;">StayNest Luxury Service Fee</td>
                                            <td align="right" style="padding: 6px 0; font-weight: 600;">₹${Number(booking.serviceFee || 450).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0;">Payment Method</td>
                                            <td align="right" style="padding: 6px 0; font-weight: 600; text-transform: uppercase; color: #143528;">${booking.paymentMethod || 'Razorpay'}</td>
                                        </tr>
                                        <tr style="border-top: 2px solid #143528;">
                                            <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 800; color: #143528;">Total Amount (${booking.paymentStatus === 'paid' ? 'Paid' : 'Due on Arrival'})</td>
                                            <td align="right" style="padding: 12px 0 0 0; font-size: 18px; font-weight: 800; color: #143528;">₹${formattedAmount}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Action CTA Button -->
                            <tr>
                                <td style="padding: 10px 40px 30px 40px; text-align: center;">
                                    <a href="http://localhost:3001/bookings" style="display: inline-block; background: linear-gradient(135deg, #143528 0%, #0B1C14 100%); color: #FAF8F5; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 16px rgba(20, 53, 40, 0.25);">
                                        View Full Reservation in StayNest &rarr;
                                    </a>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #FAF8F5; padding: 24px 40px; text-align: center; border-top: 1px solid #EAE5D9;">
                                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #717171;">
                                        Need help with your stay? Reply directly to this email or visit our 24/7 Guest Concierge.
                                    </p>
                                    <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                                        &copy; ${new Date().getFullYear()} StayNest Luxury Accommodations. All rights reserved.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"StayNest Concierge" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Reservation Confirmed: ${booking.propertyTitle} (#STAY-${bookingRef})`,
            text: `Namaste ${userName}! Your reservation at ${booking.propertyTitle} has been confirmed. Check-in: ${checkInDate}, Check-out: ${checkOutDate}. Total: ₹${formattedAmount}. View your booking at http://localhost:3001/bookings`,
            html: htmlContent,
        };

        const info = await mailClient.sendMail(mailOptions);
        console.log(`[EmailService] Booking confirmation email sent to ${toEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("[EmailService] Error sending booking confirmation email:", error);
        return { success: false, error: error.message };
    }
};

