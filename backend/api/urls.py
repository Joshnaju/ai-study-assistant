from django.urls import include, path
from .views import ChatConversationDetailView, ChatConversationListCreateView, DocumentViewSet, LoginView, MCQGenerationView, RAGSearchView, RegisterView, SummaryView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(
    "documents",
    DocumentViewSet,
    basename="document"
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("", include(router.urls)),
    path("rag/search/", RAGSearchView.as_view(), name="rag-search"),
    path("chats/",ChatConversationListCreateView.as_view(),name="chat-list-create"),
    path("summary/", SummaryView.as_view(), name="document-summary"),
    path("mcq/", MCQGenerationView.as_view(), name="generate-mcq"),
    path("chats/<int:pk>/",ChatConversationDetailView.as_view(),name="chat-detail"),
    path("chats/<int:pk>/",ChatConversationDetailView.as_view(),name="chat-detail"),
]