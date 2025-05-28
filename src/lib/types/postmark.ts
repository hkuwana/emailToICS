export interface PostmarkEmailAddress {
	Email: string;
	Name: string;
	MailboxHash?: string;
}

export interface PostmarkAttachment {
	Name: string;
	Content: string; // Base64 encoded content
	ContentType: string;
	ContentLength: number;
	ContentID?: string;
}

export interface PostmarkHeader {
	Name: string;
	Value: string;
}

export interface PostmarkWebhookPayload {
	FromName?: string;
	MessageStream: string;
	From?: string;
	FromFull?: PostmarkEmailAddress;
	To: string; // Can be a comma-separated list of emails
	ToFull?: PostmarkEmailAddress[];
	Cc?: string; // Can be a comma-separated list of emails
	CcFull?: PostmarkEmailAddress[];
	Bcc?: string; // Can be a comma-separated list of emails
	BccFull?: PostmarkEmailAddress[];
	OriginalRecipient?: string;
	Subject?: string;
	MessageID?: string;
	ReplyTo?: string;
	MailboxHash?: string;
	Date?: string; // Date string, format can vary
	TextBody?: string;
	HtmlBody?: string;
	StrippedTextReply?: string;
	Tag?: string;
	Headers?: PostmarkHeader[];
	Attachments?: PostmarkAttachment[];
	RawEmail?: string; // Only included if RawEmailEnabled is true on the server settings
}
