from django.db import models
from django.contrib.auth.models import User

class Document(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="documents"
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="study_documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # True only after indexing succeeds
    is_indexed = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class ChatConversation(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    title = models.CharField(
        max_length=255,
        default="New Chat",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
    ]

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    sources = models.JSONField(default=list, blank=True)
    mcqs = models.JSONField(default=list, blank=True)
    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"