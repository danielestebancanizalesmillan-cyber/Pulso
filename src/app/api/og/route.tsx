import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs'; // Use Node.js runtime for Prisma support

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new Response('Missing id', { status: 400 });
        }

        const tweet = await prisma.tweet.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        name: true,
                        username: true,
                        avatar: true,
                        image: true,
                        verificationType: true,
                        accountLabel: true,
                    }
                },
                images: { select: { url: true, type: true } },
            }
        });

        if (!tweet) {
            return new Response('Tweet not found', { status: 404 });
        }

        const avatarUrl = tweet.author.avatar || tweet.author.image || "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
        
        // Ensure HTTPS/Absolute for Satori
        const secureAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `https://via.placeholder.com/150`;

        return new ImageResponse(
            (
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#15202b', // Dark theme (Soft Dark)
                    color: '#ffffff',
                    padding: '40px 60px',
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}>
                    {/* Header: User Info */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={secureAvatarUrl} 
                            alt="avatar" 
                            style={{ width: '80px', height: '80px', borderRadius: '50%', marginRight: '20px', border: '2px solid #1d9bf0' }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800 }}>{tweet.author.name}</span>
                                {tweet.author.verificationType !== "NONE" && (
                                    <div style={{
                                        display: 'flex',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: tweet.author.verificationType === "GOLD" ? "#ffd700" : "#1d9bf0",
                                        color: '#000',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>✓</div>
                                )}
                                {tweet.author.accountLabel && (
                                    <span style={{ background: '#273340', color: '#8899a6', fontSize: '14px', padding: '2px 8px', borderRadius: '4px', marginLeft: '6px' }}>
                                        {tweet.author.accountLabel}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '24px', color: '#8899a6' }}>@{tweet.author.username}</span>
                        </div>
                    </div>

                    {/* Body: Tweet Content */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        fontSize: tweet.content.length > 140 ? '36px' : '48px',
                        fontWeight: 500,
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {tweet.content}
                    </div>

                    {/* Media Preview (Footer placeholder/Indicator) */}
                    {tweet.images && tweet.images.length > 0 && (
                        <div style={{ display: 'flex', color: '#1d9bf0', fontSize: '20px', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1d9bf0' }} />
                            <span>Contiene {tweet.images.length} archivo{tweet.images.length > 1 ? 's' : ''} multimedia</span>
                        </div>
                    )}

                    {/* Footer / Watermark */}
                    <div style={{
                        display: 'flex',
                        position: 'absolute',
                        bottom: '40px',
                        right: '60px',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '24px', color: '#1d9bf0', fontWeight: 800 }}>Pulso</span>
                        <span style={{ fontSize: '20px', color: '#8899a6' }}>· Red Social</span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 600,
            }
        );
    } catch (e: any) {
        console.error(e);
        return new Response('Internal Server Error', { status: 500 });
    }
}
